import { JobStatus } from '../types'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function submitGenerate(formData: FormData): Promise<{ jobId: string }> {
  const res = await fetch(`${API}/api/generate`, { method: 'POST', body: formData })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function pollStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${API}/api/status/${jobId}`)
  if (!res.ok) throw new Error('Status fetch failed')
  return res.json()
}

export async function getHistory() {
  const res = await fetch(`${API}/api/history`)
  if (!res.ok) throw new Error('History fetch failed')
  return res.json()
}

export function getVideoUrl(videoPath: string): string {
  return `${API}/videos/${videoPath.split('/').pop()}`
}
