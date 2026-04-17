'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitGenerate } from '../lib/api'

const inputStyle = {
  width: '100%', padding: '10px 12px', background: '#1a1a1a',
  border: '1px solid #333', borderRadius: '8px', color: '#f0f0f0',
  fontSize: '14px', boxSizing: 'border-box' as const
}
const labelStyle = { fontSize: '13px', color: '#888', display: 'block', marginBottom: '6px' }
const fieldStyle = { marginBottom: '16px' }

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [screenshots, setScreenshots] = useState<File[]>([])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const data = new FormData(form)
    screenshots.forEach(f => data.append('screenshots', f))

    try {
      const { jobId } = await submitGenerate(data)
      router.push(`/generate?jobId=${jobId}`)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Generate ad videos</h1>
      <p style={{ color: '#888', marginBottom: '2rem', fontSize: '15px' }}>
        Fill in your product details — you'll get 3 short vertical ads with voiceover.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Product name</label>
            <input name="productName" style={inputStyle} required placeholder="AdForge" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Target audience</label>
            <input name="targetAudience" style={inputStyle} required placeholder="Indie hackers and founders" />
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>What it does</label>
          <textarea name="description" style={{ ...inputStyle, height: '70px', resize: 'vertical' }}
            required placeholder="Turns product copy into short vertical ad videos with voiceover" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Main pain point</label>
            <input name="painPoint" style={inputStyle} required placeholder="Paying $200+ for creator videos" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Main benefit</label>
            <input name="mainBenefit" style={inputStyle} required placeholder="Generate 3 ads in 2 minutes, free" />
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>CTA</label>
          <input name="cta" style={inputStyle} required placeholder="Try it free — no signup needed" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Screenshots (optional, up to 5)</label>
          <input type="file" accept="image/*" multiple
            onChange={e => setScreenshots(Array.from(e.target.files || []).slice(0, 5))}
            style={{ ...inputStyle, padding: '8px' }} />
          {screenshots.length > 0 && (
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {screenshots.length} file(s) selected
            </p>
          )}
        </div>

        {error && (
          <div style={{ background: '#2a1010', border: '1px solid #5a2020', borderRadius: '8px',
            padding: '12px', marginBottom: '16px', color: '#ff6b6b', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: '14px', background: loading ? '#333' : '#7c3aed',
            color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px',
            fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Starting...' : 'Generate 3 ad videos'}
        </button>
      </form>
    </div>
  )
}
