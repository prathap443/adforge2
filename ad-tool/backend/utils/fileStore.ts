import fs from 'fs'
import path from 'path'
import { JobManifest } from '../types'

const HISTORY_DIR = path.join(__dirname, '../tmp/history')

export async function saveJobManifest(jobId: string, data: Omit<JobManifest, 'id' | 'createdAt'>): Promise<void> {
  const manifest: JobManifest = {
    id: jobId,
    createdAt: new Date().toISOString(),
    ...data
  }
  fs.writeFileSync(
    path.join(HISTORY_DIR, `${jobId}.json`),
    JSON.stringify(manifest, null, 2)
  )
}

export async function getJobManifest(jobId: string): Promise<JobManifest | null> {
  const filePath = path.join(HISTORY_DIR, `${jobId}.json`)
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

export async function listJobManifests(): Promise<JobManifest[]> {
  if (!fs.existsSync(HISTORY_DIR)) return []
  const files = fs.readdirSync(HISTORY_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, 20)

  return files.map(f => {
    const content = fs.readFileSync(path.join(HISTORY_DIR, f), 'utf-8')
    return JSON.parse(content) as JobManifest
  })
}
