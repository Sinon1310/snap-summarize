import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { getJobResult } from '../api'

const sentimentConfig = {
  POSITIVE: { emoji: '😊', label: 'Positive', color: '#4ade80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.25)' },
  NEGATIVE: { emoji: '😔', label: 'Negative', color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
  NEUTRAL:  { emoji: '😐', label: 'Neutral',  color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)' },
  MIXED:    { emoji: '🤔', label: 'Mixed',    color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
}

const phraseColors = ['#38bdf8', '#a78bfa', '#4ade80', '#fbbf24', '#f472b6', '#22d3ee', '#fb923c', '#a3e635']

const cardStyle = {
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
  padding: '28px',
  boxShadow: '0 20px 40px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
}

const ResultsPage = () => {
  const [searchParams] = useSearchParams()
  const jobId = searchParams.get('jobId')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)
  const intervalRef = useRef(null)
  const timerRef = useRef(null)
  const startRef = useRef(Date.now())
  const isDemo = jobId?.startsWith('demo-')

  const fetchResults = useCallback(async () => {
    if (!jobId) { setError('No job ID provided'); setIsLoading(false); return }
    try {
      const data = await getJobResult(jobId)
      setResult(data)
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        setIsLoading(false)
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch results')
      setIsLoading(false)
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
  }, [jobId])

  useEffect(() => {
    startRef.current = Date.now()
    fetchResults()
    intervalRef.current = setInterval(fetchResults, 2000)
    timerRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startRef.current) / 1000))
    }, 500)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [fetchResults])

  const handleCopy = () => {
    navigator.clipboard.writeText(result?.summary || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleDownload = () => {
    if (!result) return
    const text = `# SnapSummarize Results\n\n## Summary\n${result.summary}\n\n## Sentiment\n${result.sentiment}\n\n## Key Phrases\n${(result.keyPhrases || []).join(', ')}\n\n---\nJob ID: ${result.jobId}\nProcessed: ${result.timestamp ? new Date(result.timestamp).toLocaleString() : 'N/A'}`
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `summary-${result.jobId.slice(0, 8)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── Shared page wrapper ──
  const pageWrap = (children, extraBg = '') => (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #060b18 0%, #0d1626 40%, #0a0e1a 100%)', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      {extraBg}
      <div style={{ position: 'relative', zIndex: 10, ...cardStyle, maxWidth: '480px', width: '100%', textAlign: 'center' }}>{children}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes bounce { 0%,80%,100%{ transform:translateY(0)} 40%{transform:translateY(-10px)} } @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } } @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  )

  // ─── No job ID ──
  if (!jobId) return pageWrap(
    <>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
      <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'white', marginBottom: '10px' }}>No Job ID</h2>
      <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '14px' }}>Submit a URL or file to get started.</p>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', color: 'white', fontWeight: '600', textDecoration: 'none', fontSize: '14px' }}>← Go Home</Link>
    </>
  )

  // ─── Error state ──
  if (error && !result) return pageWrap(
    <>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
      <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'white', marginBottom: '10px' }}>Something went wrong</h2>
      <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '14px' }}>{error}</p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button onClick={fetchResults} style={{ padding: '12px 20px', borderRadius: '12px', background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', color: 'white', fontWeight: '600', border: 'none', cursor: 'pointer', fontSize: '14px' }}>🔄 Retry</button>
        <Link to="/" style={{ padding: '12px 20px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontWeight: '600', textDecoration: 'none', fontSize: '14px' }}>Home</Link>
      </div>
    </>
  )

  // ─── Loading / Processing ──
  if (isLoading || result?.status === 'PENDING' || result?.status === 'PROCESSING') {
    const isProcesing = result?.status === 'PROCESSING'
    const progressPct = isProcesing ? Math.min(85, 30 + elapsedSec * 8) : Math.min(28, elapsedSec * 7)

    return pageWrap(
      <>
        {/* Spinner */}
        <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 24px' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: '#0ea5e9', animation: 'spin 1s linear infinite' }} />
          <div style={{ position: 'absolute', inset: '8px', borderRadius: '50%', border: '3px solid transparent', borderTopColor: '#8b5cf6', animation: 'spin 1.5s linear infinite reverse' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🤖</div>
        </div>

        {/* Bouncing dots */}
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '16px' }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: ['#0ea5e9','#8b5cf6','#10b981'][i], animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite` }} />)}
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'white', marginBottom: '6px' }}>
          {isProcesing ? '🤖 AI is analyzing content…' : '⏳ Queued for processing…'}
        </h2>
        <p style={{ color: '#475569', fontSize: '13px', marginBottom: '20px' }}>This usually takes 5–30 seconds</p>

        {/* Progress bar */}
        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, #0ea5e9, #8b5cf6)', transition: 'width 0.6s ease-out', width: `${progressPct}%` }} />
        </div>

        {/* Details */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#475569', fontSize: '13px' }}>Job ID</span>
            <code style={{ color: '#38bdf8', background: 'rgba(14,165,233,0.1)', padding: '3px 10px', borderRadius: '6px', fontSize: '12px' }}>{jobId.slice(0, 12)}…</code>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#475569', fontSize: '13px' }}>Status</span>
            <span style={{ padding: '3px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', background: isProcesing ? 'rgba(251,191,36,0.12)' : 'rgba(100,116,139,0.15)', color: isProcesing ? '#fbbf24' : '#64748b' }}>{result?.status || 'PENDING'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#475569', fontSize: '13px' }}>Elapsed</span>
            <span style={{ color: '#64748b', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>{elapsedSec}s</span>
          </div>
          {isDemo && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
              <span style={{ padding: '3px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', background: 'rgba(14,165,233,0.1)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.2)' }}>🎭 Demo Mode</span>
            </div>
          )}
        </div>
      </>
    )
  }

  // ─── Failed ──
  if (result?.status === 'FAILED') return pageWrap(
    <>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>💔</div>
      <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'white', marginBottom: '10px' }}>Processing Failed</h2>
      <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '14px', lineHeight: 1.6 }}>Could not process your content. It may be inaccessible or in an unsupported format.</p>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', color: 'white', fontWeight: '600', textDecoration: 'none', fontSize: '14px' }}>🔄 Try Again</Link>
    </>
  )

  // ─── COMPLETED ─────────────────────────────────────────────────
  const sentiment = sentimentConfig[result.sentiment] || sentimentConfig.NEUTRAL
  const wordCount = result.summary ? result.summary.split(/\s+/).length : 0

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #060b18 0%, #0d1626 40%, #0a0e1a 100%)', fontFamily: "'Inter', sans-serif" }}>
      {/* ambient blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      </div>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', background: 'rgba(6,11,24,0.7)' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(14,165,233,0.4)' }}>
              <span style={{ fontSize: '18px' }}>⚡</span>
            </div>
            <span style={{ fontWeight: '800', fontSize: '18px', background: 'linear-gradient(90deg, #38bdf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SnapSummarize</span>
          </Link>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', textDecoration: 'none', fontSize: '13px', fontWeight: '500', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Summary
          </Link>
        </div>
      </header>

      <div style={{ position: 'relative', zIndex: 10, maxWidth: '780px', margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '40px', animation: 'fadeIn 0.5s ease-out' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)', margin: '0 auto 20px', fontSize: '32px' }}>✅</div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'white', marginBottom: '8px', letterSpacing: '-0.02em' }}>Summary Ready!</h1>
          <p style={{ color: '#475569', fontSize: '15px' }}>Here's what the AI found in your content</p>
          {isDemo && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '12px', padding: '5px 14px', borderRadius: '999px', background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)' }}>
              <span style={{ fontSize: '12px' }}>🎭</span>
              <span style={{ color: '#38bdf8', fontSize: '12px', fontWeight: '600' }}>Demo Mode — simulated results</span>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px', animation: 'slideUp 0.5s ease-out 0.1s both' }}>
          {[
            { icon: '📊', label: 'Sentiment', value: sentiment.label, valueColor: sentiment.color },
            { icon: '📝', label: 'Words', value: wordCount, valueColor: '#38bdf8' },
            { icon: '🏷️', label: 'Topics', value: result.keyPhrases?.length || 0, valueColor: '#a78bfa' },
          ].map((stat, i) => (
            <div key={i} style={{ ...cardStyle, padding: '16px', textAlign: 'center' }}>
              <span style={{ fontSize: '20px', display: 'block', marginBottom: '6px' }}>{stat.icon}</span>
              <p style={{ color: '#475569', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{stat.label}</p>
              <p style={{ color: stat.valueColor, fontSize: '18px', fontWeight: '700' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Summary card */}
        <div style={{ ...cardStyle, marginBottom: '16px', animation: 'slideUp 0.5s ease-out 0.2s both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📝</span> Summary
            </h2>
            {result.sentiment && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', background: sentiment.bg, border: `1px solid ${sentiment.border}` }}>
                <span style={{ fontSize: '16px' }}>{sentiment.emoji}</span>
                <span style={{ color: sentiment.color, fontWeight: '600', fontSize: '13px' }}>{sentiment.label}</span>
              </div>
            )}
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '22px', borderLeft: '3px solid #0ea5e9', position: 'relative' }}>
            <p style={{ color: '#e2e8f0', fontSize: '16px', lineHeight: 1.85, margin: 0 }}>{result.summary || 'No summary available.'}</p>
          </div>
        </div>

        {/* Key Phrases */}
        {result.keyPhrases?.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: '16px', animation: 'slideUp 0.5s ease-out 0.3s both' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🏷️</span> Key Phrases
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {result.keyPhrases.map((phrase, i) => (
                <span key={i} style={{
                  padding: '7px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: '500',
                  background: `${phraseColors[i % phraseColors.length]}12`,
                  color: phraseColors[i % phraseColors.length],
                  border: `1px solid ${phraseColors[i % phraseColors.length]}35`,
                  transition: 'all 0.15s',
                  cursor: 'default',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.background = `${phraseColors[i % phraseColors.length]}22` }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = `${phraseColors[i % phraseColors.length]}12` }}
                >{phrase}</span>
              ))}
            </div>
          </div>
        )}

        {/* Job details */}
        <div style={{ ...cardStyle, background: 'rgba(0,0,0,0.2)', marginBottom: '32px', animation: 'slideUp 0.5s ease-out 0.4s both' }}>
          <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>Job Details</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {[
              { label: 'Job ID', value: <code style={{ color: '#38bdf8', background: 'rgba(14,165,233,0.1)', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', wordBreak: 'break-all' }}>{result.jobId}</code> },
              { label: 'Type', value: <span style={{ color: '#94a3b8', textTransform: 'capitalize', fontSize: '14px' }}>{result.type || 'url'}</span> },
              { label: 'Processed', value: <span style={{ color: '#94a3b8', fontSize: '14px' }}>{result.timestamp ? new Date(result.timestamp).toLocaleString() : 'N/A'}</span> },
              { label: 'Summary Words', value: <span style={{ color: '#94a3b8', fontSize: '14px' }}>{wordCount}</span> },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#334155', fontSize: '13px' }}>{row.label}</span>
                {row.value}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', animation: 'slideUp 0.5s ease-out 0.5s both' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: 'white', fontWeight: '700', textDecoration: 'none', fontSize: '14px', boxShadow: '0 8px 24px -4px rgba(14,165,233,0.4)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 12px 32px -4px rgba(14,165,233,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 24px -4px rgba(14,165,233,0.4)' }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Summarize Another
          </Link>
          <button onClick={handleCopy} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: '12px', background: copied ? 'rgba(74,222,128,0.1)' : 'transparent', border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}`, color: copied ? '#4ade80' : '#64748b', fontWeight: '600', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { if (!copied) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#94a3b8' } }}
            onMouseLeave={e => { if (!copied) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#64748b' } }}
          >
            {copied ? <><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copied!</> : <><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy Summary</>}
          </button>
          <button onClick={handleDownload} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', fontWeight: '600', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#94a3b8' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#64748b' }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download .md
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  )
}

export default ResultsPage
