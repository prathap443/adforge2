import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { generateRoute } from './routes/generate'
import { statusRoute } from './routes/status'
import { historyRoute } from './routes/history'

dotenv.config()

// Auto-create tmp directories on startup
const dirs = ['tmp/uploads', 'tmp/audio', 'tmp/frames', 'tmp/videos', 'tmp/history']
dirs.forEach(d => {
  const full = path.join(__dirname, d)
  if (!fs.existsSync(full)) {
    fs.mkdirSync(full, { recursive: true })
    console.log(`[Init] Created directory: ${full}`)
  }
})

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }))
app.use(express.json())

app.use('/videos', express.static(path.join(__dirname, 'tmp/videos')))
app.use('/audio', express.static(path.join(__dirname, 'tmp/audio')))

app.use('/api', generateRoute)
app.use('/api', statusRoute)
app.use('/api', historyRoute)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  console.log(`AdForge backend running on http://localhost:${PORT}`)
})
