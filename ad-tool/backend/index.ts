import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'
import { generateRoute } from './routes/generate'
import { statusRoute } from './routes/status'
import { historyRoute } from './routes/history'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Create tmp directories on startup
const dirs = [
  'tmp/uploads',
  'tmp/audio',
  'tmp/frames',
  'tmp/videos',
  'tmp/history',
  'tmp/text'
]

dirs.forEach((d) => {
  const full = path.join(__dirname, d)
  if (!fs.existsSync(full)) {
    fs.mkdirSync(full, { recursive: true })
    console.log(`[Init] Created directory: ${full}`)
  }
})

// Verify FFmpeg is available
try {
  const ffmpegVersion = execSync('ffmpeg -version 2>&1')
    .toString()
    .split('\n')[0]
  console.log(`[Init] FFmpeg found: ${ffmpegVersion}`)
} catch (_e) {
  console.error('[Init] FFmpeg NOT FOUND — video renders will fail!')
}

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000'
  })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/videos', express.static(path.join(__dirname, 'tmp/videos')))
app.use('/audio', express.static(path.join(__dirname, 'tmp/audio')))

app.use('/api', generateRoute)
app.use('/api', statusRoute)
app.use('/api', historyRoute)

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    ffmpeg: true
  })
})

app.listen(PORT, () => {
  console.log(`AdForge backend running on http://localhost:${PORT}`)
})
