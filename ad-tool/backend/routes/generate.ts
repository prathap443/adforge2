import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { validateProductInput } from '../utils/validators'
import { generateScripts } from '../services/scriptGenerator'
import { assignSceneTiming } from '../services/sceneTiming'
import { generateVoiceover } from '../services/ttsService'
import { renderAdVideo } from '../services/renderer'
import { saveJobManifest } from '../utils/fileStore'
import { jobs } from '../utils/jobStore'

const router = Router()

const upload = multer({
  dest: path.join(__dirname, '../tmp/uploads'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  }
})

router.post('/generate', upload.array('screenshots', 5), async (req: Request, res: Response) => {
  const jobId = uuid()

  try {
    const validation = validateProductInput(req.body)

    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid input', details: validation.errors })
    }

    const screenshots = (req.files as Express.Multer.File[] || []).map(f => f.path)

    const productInput = {
      productName: validation.data.productName,
      description: validation.data.description,
      targetAudience: validation.data.targetAudience,
      painPoint: validation.data.painPoint,
      mainBenefit: validation.data.mainBenefit,
      cta: validation.data.cta,
      screenshots
    }

    // Return jobId immediately — pipeline runs in background
    res.json({ jobId, status: 'started' })

    // Step 1: Generate scripts
    jobs.set(jobId, { status: 'generating_scripts', step: 1, totalSteps: 4 })
    const scriptResult = await generateScripts(productInput)
    const timedAds = assignSceneTiming(scriptResult.ads)

    // Step 2: Generate voiceovers
    jobs.set(jobId, { status: 'generating_voiceovers', step: 2, totalSteps: 4 })
    for (const ad of timedAds) {
      ad.audioPath = await generateVoiceover(ad.voiceover, `${jobId}-${ad.angle}`)
    }

    // Step 3: Render videos
    jobs.set(jobId, { status: 'rendering_videos', step: 3, totalSteps: 4 })
    for (const ad of timedAds) {
      ad.videoPath = await renderAdVideo(ad, screenshots, jobId)
    }

    // Step 4: Save and done
    await saveJobManifest(jobId, { input: productInput, ads: timedAds })
    jobs.set(jobId, { status: 'done', step: 4, totalSteps: 4, ads: timedAds })

  } catch (err: any) {
    console.error(`[${jobId}] Pipeline error:`, err)
    jobs.set(jobId, { status: 'error', error: err.message || 'Unknown error' })
  }
})

export { router as generateRoute }
