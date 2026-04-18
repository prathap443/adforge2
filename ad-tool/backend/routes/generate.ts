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

// ==============================
// File upload config
// ==============================
const upload = multer({
  dest: path.join(__dirname, '../tmp/uploads'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  }
})

// ==============================
// Generate route
// ==============================
router.post('/generate', upload.array('screenshots', 5), async (req: Request, res: Response) => {
  const jobId = uuid()

  try {
    const validation = validateProductInput(req.body)

    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validation.errors
      })
    }

    const d = validation.data

    const screenshots = (req.files as Express.Multer.File[] || []).map(f => f.path)

    const productInput = {
      productName: d.productName as string,
      description: d.description as string,
      targetAudience: d.targetAudience as string,
      painPoint: d.painPoint as string,
      mainBenefit: d.mainBenefit as string,
      cta: d.cta as string,
      screenshots
    }

    // ✅ Return immediately (important for frontend)
    res.json({ jobId, status: 'started' })

    // ==============================
    // Background pipeline
    // ==============================
    ;(async () => {
      try {
        jobs.set(jobId, { status: 'generating_scripts', step: 1, totalSteps: 4 })

        const scriptResult = await generateScripts(productInput)
        const timedAds = assignSceneTiming(scriptResult.ads)

        jobs.set(jobId, { status: 'generating_voiceovers', step: 2, totalSteps: 4 })

        for (const ad of timedAds) {
          ad.audioPath = await generateVoiceover(ad.voiceover, `${jobId}-${ad.angle}`)
        }

        jobs.set(jobId, { status: 'rendering_videos', step: 3, totalSteps: 4 })

        for (const ad of timedAds) {
          ad.videoPath = await renderAdVideo(ad, screenshots, jobId)
        }

        // ==============================
        // 🔥 Convert paths → PUBLIC URLs
        // ==============================
        const baseUrl =
          process.env.PUBLIC_BACKEND_URL ||
          'https://adforge2-production.up.railway.app'

        for (const ad of timedAds) {
          if (ad.videoPath) {
            const fileName = path.basename(ad.videoPath)
            ad.videoPath = `${baseUrl}/videos/${fileName}`
          }

          if (ad.audioPath) {
            const fileName = path.basename(ad.audioPath)
            ad.audioPath = `${baseUrl}/audio/${fileName}`
          }
        }

        await saveJobManifest(jobId, { input: productInput, ads: timedAds })

        jobs.set(jobId, {
          status: 'done',
          step: 4,
          totalSteps: 4,
          ads: timedAds
        })
      } catch (err: any) {
        console.error(`[${jobId}] Pipeline error:`, err)

        jobs.set(jobId, {
          status: 'error',
          error: err.message || 'Unknown error'
        })
      }
    })()
  } catch (err: any) {
    console.error(`[${jobId}] Immediate error:`, err)

    return res.status(500).json({
      error: err.message || 'Internal error'
    })
  }
})

export { router as generateRoute }
