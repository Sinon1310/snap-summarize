import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { getJobResult } from '../api'

const ResultsPage = () => {
  const [searchParams] = useSearchParams()
  const jobId = searchParams.get('jobId')

  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const fetchResults = useCallback(async () => {
    if (!jobId) {
      setError('No job ID provided')
      setIsLoading(false)
      return
    }

    try {
      const data = await getJobResult(jobId)
      setResult(data)
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        setIsLoading(false)
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch results')
      setIsLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    fetchResults()
    const interval = setInterval(() => {
      if (result?.status === 'PENDING' || result?.status === 'PROCESSING' || (!result && isLoading)) {
        fetchResults()
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [fetchResults, result?.status, isLoading])

  const handleCopy = () => {
    navigator.clipboard.writeText(result?.summary || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const cardStyle = {
    background: 'rgba(15, 23, 42, 0.9)',
    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(51, 65, 85, 0.6)',
    borderRadius: '20px', padding: '28px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
  }

  const btnPrimary = {
    padding: '14px 24px', borderRadius: '12px',
    fontWeight: '600', fontSize: '15px', color: 'white', border: 'none', cursor: 'pointer',
    background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
    boxShadow: '0 8px 20px -4px rgba(14, 165, 233, 0.4)',
    display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none'
  }

  const btnSecondary = {
    padding: '14px 24px', borderRadius: '12px',
    fontWeight: '600', fontSize: '15px', color: '#cbd5e1', cursor: 'pointer',
    background: 'transparent', border: '1px solid rgba(71, 85, 105, 0.6)',
    display: 'inline-flex', alignItems: 'center', gap: '8px'
  }

  // No jobId
  if (!jobId) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ ...cardStyle, textAlign: 'center', maxWidth: '440px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(251, 191, 36, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span style={{ fontSize: '32px' }}>⚠️</span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'white', marginBottom: '12px' }}>No Job ID Found</h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Please submit a URL or file to get started.</p>
          <Link to="/" style={btnPrimary}>← Go Home</Link>
        </div>
      </div>
    )
  }

  // Error
  if (error && !result) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ ...cardStyle, textAlign: 'center', maxWidth: '440px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span style={{ fontSize: '32px' }}>❌</span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'white', marginBottom: '12px' }}>Something went wrong</h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>{error}</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={fetchResults} style={btnPrimary}>🔄 Try Again</button>
            <Link to="/" style={btnSecondary}>Go Home</Link>
          </div>
        </div>
      </div>
    )
  }

  // Loading / Processing
  if (isLoading || result?.status === 'PENDING' || result?.status === 'PROCESSING') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ ...cardStyle, textAlign: 'center', maxWidth: '480px' }}>
          {/* Spinner */}
          <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 24px' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '4px solid rgba(51, 65, 85, 0.4)' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '4px solid transparent', borderTopColor: '#0ea5e9', animation: 'spin 1s linear infinite' }} />
            <div style={{ position: 'absolute', inset: '8px', borderRadius: '50%', border: '4px solid transparent', borderTopColor: '#8b5cf6', animation: 'spin 1.5s linear infinite reverse' }} />
          </div>

          {/* Bouncing dots */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: '12px', height: '12px', borderRadius: '50%',
                background: ['#0ea5e9', '#8b5cf6', '#10b981'][i],
                animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`
              }} />
            ))}
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'white', marginBottom: '8px' }}>
            {result?.status === 'PROCESSING' ? '🤖 AI is analyzing...' : '⏳ Queued for processing...'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>This usually takes 10-30 seconds</p>

          <div style={{ borderTop: '1px solid rgba(51, 65, 85, 0.5)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>Job ID</span>
              <code style={{ color: '#38bdf8', background: 'rgba(30, 41, 59, 0.8)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>{jobId.slice(0, 8)}...</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>Status</span>
              <span style={{
                padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '600',
                background: result?.status === 'PROCESSING' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(100, 116, 139, 0.2)',
                color: result?.status === 'PROCESSING' ? '#fbbf24' : '#94a3b8'
              }}>{result?.status || 'PENDING'}</span>
            </div>
          </div>
        </div>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-12px); } }
        `}</style>
      </div>
    )
  }

  // Failed
  if (result?.status === 'FAILED') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ ...cardStyle, textAlign: 'center', maxWidth: '440px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span style={{ fontSize: '32px' }}>💔</span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'white', marginBottom: '12px' }}>Processing Failed</h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px', lineHeight: 1.6 }}>
            We couldn't process your content. This might be due to an unsupported format or the content being inaccessible.
          </p>
          <Link to="/" style={btnPrimary}>🔄 Try Again</Link>
        </div>
      </div>
    )
  }

  // Success - Completed
  const sentimentConfig = {
    POSITIVE: { emoji: '😊', label: 'Positive', bg: 'rgba(16, 185, 129, 0.15)', color: '#4ade80', border: 'rgba(16, 185, 129, 0.3)' },
    NEGATIVE: { emoji: '😔', label: 'Negative', bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
    NEUTRAL: { emoji: '😐', label: 'Neutral', bg: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)' },
    MIXED: { emoji: '🤔', label: 'Mixed', bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)' }
  }
  const sentiment = sentimentConfig[result.sentiment] || sentimentConfig.NEUTRAL

  const phraseColors = ['#38bdf8', '#a78bfa', '#4ade80', '#fbbf24', '#f472b6', '#22d3ee']

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '-100px', left: '-100px', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 10, maxWidth: '720px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px solid rgba(16, 185, 129, 0.3)' }}>
            <span style={{ fontSize: '40px' }}>✅</span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'white', marginBottom: '8px' }}>Summary Ready!</h1>
          <p style={{ color: '#94a3b8', fontSize: '16px' }}>Here's the AI-generated summary of your content</p>
        </div>

        {/* Summary Card */}
        <div style={{ ...cardStyle, marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📝 Summary
            </h2>
            {result.sentiment && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', borderRadius: '9999px',
                background: sentiment.bg, border: `1px solid ${sentiment.border}`
              }}>
                <span style={{ fontSize: '18px' }}>{sentiment.emoji}</span>
                <span style={{ color: sentiment.color, fontWeight: '600', fontSize: '14px' }}>{sentiment.label}</span>
              </div>
            )}
          </div>
          <p style={{ color: '#e2e8f0', fontSize: '17px', lineHeight: 1.8, background: 'rgba(30, 41, 59, 0.4)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #0ea5e9' }}>
            {result.summary || 'No summary available'}
          </p>
        </div>

        {/* Key Phrases */}
        {result.keyPhrases && result.keyPhrases.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🏷️ Key Phrases
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {result.keyPhrases.map((phrase, i) => (
                <span key={i} style={{
                  padding: '8px 16px', borderRadius: '9999px', fontSize: '14px', fontWeight: '500',
                  background: `${phraseColors[i % phraseColors.length]}15`,
                  color: phraseColors[i % phraseColors.length],
                  border: `1px solid ${phraseColors[i % phraseColors.length]}40`
                }}>{phrase}</span>
              ))}
            </div>
          </div>
        )}

        {/* Job Details */}
        <div style={{ ...cardStyle, background: 'rgba(15, 23, 42, 0.6)', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Job Details</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {[
              { label: 'Job ID', value: <code style={{ color: '#38bdf8', background: 'rgba(30, 41, 59, 0.8)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>{result.jobId}</code> },
              { label: 'Type', value: <span style={{ color: '#e2e8f0', textTransform: 'capitalize' }}>{result.type || 'URL'}</span> },
              { label: 'Processed', value: <span style={{ color: '#e2e8f0' }}>{result.timestamp ? new Date(result.timestamp).toLocaleString() : 'N/A'}</span> }
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '14px' }}>{item.label}</span>
                {item.value}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" style={btnPrimary}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Summarize Another
          </Link>
          <button onClick={handleCopy} style={btnSecondary}>
            {copied ? '✓ Copied!' : (
              <><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy Summary</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResultsPage
