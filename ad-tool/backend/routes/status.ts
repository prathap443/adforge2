import { Router, Request, Response } from 'express'
import { jobs } from '../utils/jobStore'

const router = Router()

router.get('/status/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params
  const job = jobs.get(jobId)

  if (!job) {
    return res.status(404).json({ error: 'Job not found' })
  }

  res.json(job)
})

export { router as statusRoute }
