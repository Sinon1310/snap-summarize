import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { submitJob, uploadFileToS3 } from '../api'

const features = [
  {
    icon: '⚡',
    title: 'Lightning Fast',
    desc: 'Results in ~30 seconds via async queue processing',
    color: '#0ea5e9',
  },
  {
    icon: '🤖',
    title: 'AI-Powered',
    desc: 'facebook/bart-large-cnn via Hugging Face',
    color: '#8b5cf6',
  },
  {
    icon: '☁️',
    title: 'Serverless',
    desc: 'AWS Lambda + SQS, scales to infinity',
    color: '#10b981',
  },
  {
    icon: '📧',
    title: 'Email Alerts',
    desc: 'Get notified when your summary is ready',
    color: '#f59e0b',
  },
]

const HomePage = () => {
  const navigate = useNavigate()
  const [inputType, setInputType] = useState('url')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (inputType === 'url') {
        if (!url.trim()) throw new Error('Please enter a URL')
        const result = await submitJob({ type: 'url', input: url, email })
        navigate(`/results?jobId=${result.jobId}`)
      } else {
        if (!file) throw new Error('Please select a file')
        const result = await submitJob({ type: 'file', input: '', email })
        if (result.uploadUrl) await uploadFileToS3(result.uploadUrl, file)
        navigate(`/results?jobId=${result.jobId}`)
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { setError('File must be under 10MB'); return }
    setFile(f)
    setError('')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { setError('File must be under 10MB'); return }
    setFile(f)
    setError('')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #060b18 0%, #0d1626 40%, #0a0e1a 100%)', fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}>

      {/* Ambient blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(14,165,233,0.18) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(60px)', animation: 'float1 8s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '50%', left: '-15%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(60px)', animation: 'float2 10s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '20%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(60px)', animation: 'float3 7s ease-in-out infinite' }} />
        {/* Grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      </div>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', background: 'rgba(6,11,24,0.7)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(14,165,233,0.4)' }}>
              <span style={{ fontSize: '18px' }}>⚡</span>
            </div>
            <span style={{ fontWeight: '800', fontSize: '18px', background: 'linear-gradient(90deg, #38bdf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SnapSummarize</span>
          </div>
          <a href="https://github.com/Sinon1310/snap-summarize" target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', textDecoration: 'none', fontSize: '14px', fontWeight: '500', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
            GitHub
          </a>
        </div>
      </header>

      <div style={{ position: 'relative', zIndex: 10, maxWidth: '680px', margin: '0 auto', padding: '64px 24px 80px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px 6px 10px', borderRadius: '999px', background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', marginBottom: '28px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ color: '#38bdf8', fontSize: '13px', fontWeight: '600', letterSpacing: '0.02em' }}>Powered by AI · Serverless on AWS</span>
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: '800', color: 'white', lineHeight: 1.05, marginBottom: '20px', letterSpacing: '-0.02em' }}>
            Summarize anything
            <span style={{ display: 'block', marginTop: '6px', background: 'linear-gradient(90deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              in seconds ✨
            </span>
          </h1>
          <p style={{ color: '#64748b', fontSize: '18px', lineHeight: 1.7, maxWidth: '480px', margin: '0 auto' }}>
            Paste a URL or drop a file. Our AI extracts a clean summary, detects sentiment, and pulls out key topics.
          </p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '36px', boxShadow: '0 32px 64px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
          <form onSubmit={handleSubmit}>

            {/* Toggle */}
            <div style={{ display: 'flex', gap: '6px', padding: '5px', background: 'rgba(0,0,0,0.3)', borderRadius: '14px', marginBottom: '28px', border: '1px solid rgba(255,255,255,0.06)' }}>
              {['url', 'file'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setInputType(type)}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: '10px', fontWeight: '600', fontSize: '14px', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                    background: inputType === type ? 'linear-gradient(135deg, #0ea5e9, #8b5cf6)' : 'transparent',
                    color: inputType === type ? 'white' : '#475569',
                    boxShadow: inputType === type ? '0 4px 16px rgba(14,165,233,0.35)' : 'none',
                  }}
                >
                  {type === 'url'
                    ? <><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> URL</>
                    : <><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg> File</>
                  }
                </button>
              ))}
            </div>

            {/* URL Input */}
            {inputType === 'url' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Website URL</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }}>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                  </div>
                  <input
                    type="url" value={url} onChange={e => setUrl(e.target.value)}
                    placeholder="https://example.com/article-to-summarize"
                    required
                    style={{ width: '100%', padding: '14px 16px 14px 48px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontSize: '15px', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                    onFocus={e => { e.target.style.borderColor = '#0ea5e9'; e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.2)' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
                <p style={{ marginTop: '6px', fontSize: '12px', color: '#334155' }}>Any news article, blog post, Wikipedia page, etc.</p>
              </div>
            )}

            {/* File Upload */}
            {inputType === 'file' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Upload Document</label>
                <input type="file" onChange={handleFileChange} accept=".txt,.pdf,.doc,.docx,.md" id="file-upload" style={{ display: 'none' }} />
                <label
                  htmlFor="file-upload"
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px',
                    width: '100%', height: '180px', borderRadius: '16px', cursor: 'pointer',
                    background: file ? 'rgba(16,185,129,0.08)' : dragOver ? 'rgba(14,165,233,0.08)' : 'rgba(0,0,0,0.3)',
                    border: `2px dashed ${file ? 'rgba(16,185,129,0.5)' : dragOver ? '#0ea5e9' : 'rgba(255,255,255,0.1)'}`,
                    transition: 'all 0.2s', boxSizing: 'border-box',
                  }}
                >
                  {file ? (
                    <>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#4ade80"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ color: '#e2e8f0', fontWeight: '600', fontSize: '14px' }}>{file.name}</p>
                        <p style={{ color: '#64748b', fontSize: '13px' }}>{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(14,165,233,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#38bdf8"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ color: '#94a3b8', fontSize: '14px' }}><span style={{ color: '#38bdf8', fontWeight: '600' }}>Click to browse</span> or drag &amp; drop</p>
                        <p style={{ color: '#334155', fontSize: '12px', marginTop: '4px' }}>PDF, TXT, DOC, DOCX — max 10MB</p>
                      </div>
                    </>
                  )}
                </label>
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Notify me at</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{ width: '100%', padding: '14px 16px 14px 48px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontSize: '15px', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = '#0ea5e9'; e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.2)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }}
                />
              </div>
              <p style={{ marginTop: '6px', fontSize: '12px', color: '#334155' }}>We'll email you when your summary is done.</p>
            </div>

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', marginBottom: '20px', color: '#f87171', fontSize: '14px' }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit" disabled={isSubmitting}
              style={{
                width: '100%', padding: '16px', borderRadius: '14px', fontWeight: '700', fontSize: '16px', color: 'white', border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                background: isSubmitting ? 'rgba(71,85,105,0.5)' : 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 60%, #8b5cf6 100%)',
                boxShadow: isSubmitting ? 'none' : '0 8px 32px -4px rgba(14,165,233,0.5)',
                opacity: isSubmitting ? 0.6 : 1,
                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.transform = 'translateY(-1px)'; if (!isSubmitting) e.currentTarget.style.boxShadow = '0 12px 40px -4px rgba(14,165,233,0.6)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = isSubmitting ? 'none' : '0 8px 32px -4px rgba(14,165,233,0.5)' }}
            >
              {isSubmitting ? (
                <><svg width="20" height="20" fill="none" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg> Submitting job…</>
              ) : (
                <><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Summarize Now</>
              )}
            </button>
          </form>
        </div>

        {/* Feature grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '32px' }}>
          {features.map((f, i) => (
            <div key={i} style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'flex-start', gap: '14px', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = `${f.color}40` }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${f.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{f.icon}</div>
              <div>
                <p style={{ color: '#e2e8f0', fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{f.title}</p>
                <p style={{ color: '#475569', fontSize: '13px', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', color: '#1e293b', fontSize: '13px', marginTop: '40px' }}>
          Built serverless on AWS · Lambda · SQS · DynamoDB · CloudFront
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes float1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-30px,40px) scale(1.05); } }
        @keyframes float2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-30px) scale(1.08); } }
        @keyframes float3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-20px,20px) scale(1.04); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        input::placeholder { color: #334155; }
      `}</style>
    </div>
  )
}

export default HomePage
