import { Router, Request, Response } from 'express'
import { listJobManifests, getJobManifest } from '../utils/fileStore'

const router = Router()

router.get('/history', async (_req: Request, res: Response) => {
  try {
    const jobs = await listJobManifests()
    res.json({ jobs })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/history/:jobId', async (req: Request, res: Response) => {
  try {
    const manifest = await getJobManifest(req.params.jobId)
    if (!manifest) return res.status(404).json({ error: 'Not found' })
    res.json(manifest)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export { router as historyRoute }
