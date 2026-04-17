import fs from 'fs'
import path from 'path'

const TMP_DIRS = ['uploads', 'audio', 'frames', 'videos'].map(
  d => path.join(__dirname, '../tmp', d)
)
const MAX_AGE_HOURS = 24

export function startCleanupCron(): void {
  // Run every hour
  setInterval(cleanOldFiles, 60 * 60 * 1000)
  console.log('[Cleanup] Cron started — deletes files older than 24h')
}

function cleanOldFiles(): void {
  const cutoff = Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000

  for (const dir of TMP_DIRS) {
    if (!fs.existsSync(dir)) continue
    const files = fs.readdirSync(dir)

    for (const file of files) {
      if (file === '.gitkeep') continue
      const filePath = path.join(dir, file)
      try {
        const stat = fs.statSync(filePath)
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(filePath)
          console.log(`[Cleanup] Deleted: ${filePath}`)
        }
      } catch (_) {}
    }
  }
}
