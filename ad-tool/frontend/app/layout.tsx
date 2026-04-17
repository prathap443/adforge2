import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AdForge — Personal Ad Video Generator',
  description: 'Paste product copy, get 3 vertical ad videos with voiceover'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0a0a0a', color: '#f0f0f0' }}>
        <nav style={{ padding: '1rem 2rem', borderBottom: '1px solid #222', display: 'flex', gap: '2rem' }}>
          <a href="/" style={{ color: '#f0f0f0', textDecoration: 'none', fontWeight: 600 }}>AdForge</a>
          <a href="/history" style={{ color: '#888', textDecoration: 'none', fontSize: '14px' }}>History</a>
        </nav>
        <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
          {children}
        </main>
      </body>
    </html>
  )
}
