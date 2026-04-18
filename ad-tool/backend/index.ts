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

// ==============================
// Create tmp directories
// ==============================
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

// ==============================
// FFmpeg + Font Diagnostics
// ==============================
try {
  const ffmpegVersion = execSync('ffmpeg -version 2>&1')
    .toString()
    .split('\n')[0]

  console.log(`[Init] FFmpeg found: ${ffmpegVersion}`)

  const filters = execSync('ffmpeg -filters 2>&1').toString()
  console.log(`[Init] drawtext available: ${filters.includes('drawtext')}`)
} catch (e) {
  console.error('[Init] FFmpeg check failed')
}

// ==============================
// Font Debugging
// ==============================
const resolvedFont =
  process.env.FONT_PATH ||
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

console.log(`[Init] Font path env: ${process.env.FONT_PATH || '(not set)'}`)
console.log(`[Init] Using font path: ${resolvedFont}`)

if (fs.existsSync(resolvedFont)) {
  console.log('[Init] Font file found ✓')
} else {
  console.log('[Init] Font file NOT found — searching...')
  try {
    const fonts = execSync(
      'find /usr/share/fonts -name "*.ttf" 2>/dev/null | head -20'
    ).toString()

    console.log(`[Init] Available fonts:\n${fonts}`)
  } catch (e) {
    console.log('[Init] Could not list fonts')
  }
}

// ==============================
// Middleware
// ==============================
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000'
  })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Static file serving
app.use('/videos', express.static(path.join(__dirname, 'tmp/videos')))
app.use('/audio', express.static(path.join(__dirname, 'tmp/audio')))

// ==============================
// Routes
// ==============================
app.use('/api', generateRoute)
app.use('/api', statusRoute)
app.use('/api', historyRoute)

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    ffmpeg: true,
    font: fs.existsSync(resolvedFont)
  })
})

// ==============================
// Start server
// ==============================
app.listen(PORT, () => {
  console.log(`AdForge backend running on http://localhost:${PORT}`)
})
