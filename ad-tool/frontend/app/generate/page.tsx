'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { pollStatus, getVideoUrl } from '../../lib/api'
import { JobStatus, AdVariant } from '../../types'

const STEPS: Record<string, string> = {
  generating_scripts: 'Writing ad scripts with AI...',
  generating_voiceovers: 'Generating voiceovers...',
  rendering_videos: 'Rendering videos (takes ~30s)...',
  done: 'Done!',
  error: 'Something went wrong'
}

const ANGLE_LABELS: Record<string, string> = {
  pain: 'Pain hook',
  curiosity: 'Curiosity hook',
  'bold-claim': 'Bold claim'
}

export default function GeneratePage() {
  const params = useSearchParams()
  const jobId = params.get('jobId')
  const [status, setStatus] = useState<JobStatus | null>(null)

  useEffect(() => {
    if (!jobId) return
    const interval = setInterval(async () => {
      try {
        const s = await pollStatus(jobId)
        setStatus(s)
        if (s.status === 'done' || s.status === 'error') clearInterval(interval)
      } catch (e) { console.error(e) }
    }, 2000)
    return () => clearInterval(interval)
  }, [jobId])

  if (!jobId) return <p style={{ color: '#888' }}>No job ID — go back and generate.</p>

  return (
    <div>
      <h1 style={{ fontSize: '24px', marginBottom: '1.5rem' }}>Generating your ads</h1>

      {/* Progress */}
      {status && status.status !== 'done' && status.status !== 'error' && (
        <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
          padding: '1.5rem', marginBottom: '2rem' }}>
          <p style={{ color: '#a78bfa', margin: 0, fontSize: '15px' }}>
            {STEPS[status.status] || 'Processing...'}
          </p>
          <div style={{ marginTop: '12px', background: '#333', borderRadius: '99px', height: '4px' }}>
            <div style={{ width: `${((status.step || 1) / (status.totalSteps || 4)) * 100}%`,
              background: '#7c3aed', borderRadius: '99px', height: '4px', transition: 'width 0.3s' }} />
          </div>
          <p style={{ color: '#555', fontSize: '12px', marginTop: '8px', marginBottom: 0 }}>
            Step {status.step} of {status.totalSteps}
          </p>
        </div>
      )}

      {/* Error */}
      {status?.status === 'error' && (
        <div style={{ background: '#2a1010', border: '1px solid #5a2020', borderRadius: '12px',
          padding: '1.5rem', marginBottom: '2rem' }}>
          <p style={{ color: '#ff6b6b', margin: 0 }}>Error: {status.error}</p>
        </div>
      )}

      {/* Results */}
      {status?.status === 'done' && status.ads && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {status.ads.map((ad: AdVariant) => (
            <VideoCard key={ad.angle} ad={ad} />
          ))}
        </div>
      )}
    </div>
  )
}

function VideoCard({ ad }: { ad: AdVariant }) {
  const videoUrl = ad.videoPath ? getVideoUrl(ad.videoPath) : null

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <span style={{ background: '#2d1f63', color: '#a78bfa', fontSize: '12px', fontWeight: 600,
            padding: '3px 10px', borderRadius: '99px' }}>
            {ANGLE_LABELS[ad.angle] || ad.angle}
          </span>
          <p style={{ color: '#f0f0f0', fontWeight: 600, marginTop: '8px', marginBottom: 0, fontSize: '16px' }}>
            {ad.hook}
          </p>
        </div>
        {videoUrl && (
          <a href={videoUrl} download={`adforge-${ad.angle}.mp4`}
            style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151',
              padding: '7px 14px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none',
              whiteSpace: 'nowrap', marginLeft: '16px' }}>
            Download MP4
          </a>
        )}
      </div>

      {videoUrl && (
        <video src={videoUrl} controls style={{ width: '100%', maxWidth: '360px',
          borderRadius: '8px', display: 'block', marginBottom: '1rem' }} />
      )}

      <details style={{ cursor: 'pointer' }}>
        <summary style={{ color: '#666', fontSize: '13px', userSelect: 'none' }}>View script</summary>
        <div style={{ marginTop: '10px' }}>
          {ad.scenes.map((scene, i) => (
            <div key={i} style={{ background: '#111', borderRadius: '6px', padding: '8px 12px',
              marginBottom: '6px', fontSize: '13px', color: '#ccc' }}>
              <span style={{ color: '#666', fontSize: '11px' }}>Scene {i + 1} · {scene.duration}s</span>
              <p style={{ margin: '4px 0 0', color: '#f0f0f0' }}>{scene.text}</p>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
