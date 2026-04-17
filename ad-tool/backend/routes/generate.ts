import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { validateProductInput } from '../utils/validators'
import { generateScripts } from '../services/scriptGenerator'
import { assignSceneTiming } from '../services/sceneTiming'
import { generateVoiceover } from '../services/ttsService'
import { renderAdVideo } from '../services/renderer'
import { saveJobManifest, getJobManifest } from '../utils/fileStore'
import { jobs } from '../utils/jobStore'

const router = Router()

const upload = multer({
  dest: path.join(__dirname, '../tmp/uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  }
})

router.post('/generate', upload.array('screenshots', 5), async (req: Request, res: Response) => {
  const jobId = uuid()

  try {
    // 1. Validate input
    const input = validateProductInput(req.body)
    if (!input.success) {
      return res.status(400).json({ error: 'Invalid input', details: input.errors })
    }

    const screenshots = (req.files as Express.Multer.File[] || []).map(f => f.path)

    // 2. Kick off async pipeline, return jobId immediately
    res.json({ jobId, status: 'started' })

    // 3. Run pipeline in background
    jobs.set(jobId, { status: 'generating_scripts', step: 1, totalSteps: 4 })

    const productInput = { ...input.data, screenshots }

    // Step 1: Generate scripts
    const scriptResult = await generateScripts(productInput)
    const timedAds = assignSceneTiming(scriptResult.ads)

    jobs.set(jobId, { status: 'generating_voiceovers', step: 2, totalSteps: 4 })

    // Step 2: Generate voiceovers
    for (const ad of timedAds) {
      ad.audioPath = await generateVoiceover(ad.voiceover, `${jobId}-${ad.angle}`)
    }

    jobs.set(jobId, { status: 'rendering_videos', step: 3, totalSteps: 4 })

    // Step 3: Render videos (sequential — FFmpeg is CPU heavy)
    for (const ad of timedAds) {
      ad.videoPath = await renderAdVideo(ad, screenshots, jobId)
    }

    // Step 4: Save manifest + done
    await saveJobManifest(jobId, { input: productInput, ads: timedAds })
    jobs.set(jobId, { status: 'done', step: 4, totalSteps: 4, ads: timedAds })

  } catch (err: any) {
    console.error(`[${jobId}] Pipeline error:`, err)
    jobs.set(jobId, { status: 'error', error: err.message || 'Unknown error' })
  }
})

export { router as generateRoute }
