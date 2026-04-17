'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getHistory } from '../../lib/api'

export default function HistoryPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHistory().then(d => { setJobs(d.jobs || []); setLoading(false) })
  }, [])

  if (loading) return <p style={{ color: '#888' }}>Loading...</p>
  if (jobs.length === 0) return <p style={{ color: '#888' }}>No generations yet. <Link href="/">Generate one →</Link></p>

  return (
    <div>
      <h1 style={{ fontSize: '24px', marginBottom: '1.5rem' }}>History</h1>
      <div style={{ display: 'grid', gap: '10px' }}>
        {jobs.map((job: any) => (
          <Link key={job.id} href={`/generate?jobId=${job.id}`}
            style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '10px',
              padding: '1rem 1.25rem', textDecoration: 'none', color: '#f0f0f0', display: 'block' }}>
            <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{job.input?.productName || 'Untitled'}</p>
            <p style={{ color: '#666', fontSize: '12px', margin: 0 }}>
              {new Date(job.createdAt).toLocaleString()} · {job.ads?.length || 0} ads
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
