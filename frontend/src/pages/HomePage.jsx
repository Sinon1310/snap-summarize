import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { submitJob, uploadFileToS3 } from '../api'

const HomePage = () => {
  const navigate = useNavigate()
  const [inputType, setInputType] = useState('url')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (inputType === 'url') {
        if (!url.trim()) {
          throw new Error('Please enter a URL')
        }
        const result = await submitJob({ type: 'url', input: url, email })
        navigate(`/results?jobId=${result.jobId}`)
      } else {
        if (!file) {
          throw new Error('Please select a file')
        }
        const result = await submitJob({ type: 'file', input: '', email })
        if (result.uploadUrl) {
          await uploadFileToS3(result.uploadUrl, file)
        }
        navigate(`/results?jobId=${result.jobId}`)
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      setFile(selectedFile)
      setError('')
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '14px 18px',
    background: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(71, 85, 105, 0.6)',
    borderRadius: '12px',
    color: 'white',
    fontSize: '16px',
    outline: 'none',
    transition: 'all 0.2s ease'
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      {/* Animated Background */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-150px', right: '-150px', width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.3) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(80px)'
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '-150px', width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(80px)'
        }} />
        <div style={{
          position: 'absolute', bottom: '-150px', right: '20%', width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(80px)'
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 10, maxWidth: '640px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', borderRadius: '9999px', marginBottom: '24px',
            background: 'rgba(14, 165, 233, 0.15)', border: '1px solid rgba(14, 165, 233, 0.3)'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }} />
            <span style={{ color: '#38bdf8', fontSize: '14px', fontWeight: '500' }}>AI-Powered Summarization</span>
          </div>

          <h1 style={{ fontSize: '48px', fontWeight: '800', color: 'white', marginBottom: '16px', lineHeight: 1.1 }}>
            Summarize Content
            <span style={{
              display: 'block', marginTop: '8px',
              background: 'linear-gradient(90deg, #0ea5e9, #8b5cf6, #ec4899)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
            }}>
              In Seconds ✨
            </span>
          </h1>

          <p style={{ color: '#94a3b8', fontSize: '18px', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
            Paste a URL or upload a document. Our AI extracts summaries, sentiment & key phrases instantly.
          </p>
        </div>

        {/* Main Card */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(51, 65, 85, 0.6)',
          borderRadius: '24px', padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
        }}>
          <form onSubmit={handleSubmit}>
            {/* Toggle */}
            <div style={{
              display: 'flex', gap: '8px', padding: '6px',
              background: 'rgba(30, 41, 59, 0.6)', borderRadius: '16px', marginBottom: '28px'
            }}>
              {['url', 'file'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setInputType(type)}
                  style={{
                    flex: 1, padding: '14px 16px', borderRadius: '12px',
                    fontWeight: '600', fontSize: '15px', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.3s ease',
                    background: inputType === type ? 'linear-gradient(135deg, #0ea5e9, #8b5cf6)' : 'transparent',
                    color: inputType === type ? 'white' : '#94a3b8',
                    boxShadow: inputType === type ? '0 8px 20px -4px rgba(14, 165, 233, 0.5)' : 'none'
                  }}
                >
                  {type === 'url' ? (
                    <><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> URL</>
                  ) : (
                    <><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg> File</>
                  )}
                </button>
              ))}
            </div>

            {/* URL Input */}
            {inputType === 'url' && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#cbd5e1', marginBottom: '10px' }}>
                  Website URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  required
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = '#0ea5e9'; e.target.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.25)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(71, 85, 105, 0.6)'; e.target.style.boxShadow = 'none' }}
                />
                <p style={{ marginTop: '8px', fontSize: '13px', color: '#64748b' }}>Paste any article, blog, or news URL</p>
              </div>
            )}

            {/* File Upload */}
            {inputType === 'file' && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#cbd5e1', marginBottom: '10px' }}>
                  Upload Document
                </label>
                <input type="file" onChange={handleFileChange} accept=".txt,.pdf,.doc,.docx,.md" id="file-upload" style={{ display: 'none' }} required />
                <label
                  htmlFor="file-upload"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    width: '100%', height: '180px', borderRadius: '16px', cursor: 'pointer',
                    background: file ? 'rgba(16, 185, 129, 0.1)' : 'rgba(30, 41, 59, 0.5)',
                    border: `2px dashed ${file ? 'rgba(16, 185, 129, 0.5)' : 'rgba(71, 85, 105, 0.6)'}`,
                    transition: 'all 0.3s ease'
                  }}
                >
                  {file ? (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#4ade80"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <p style={{ color: 'white', fontWeight: '600' }}>{file.name}</p>
                      <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(14, 165, 233, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#38bdf8"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      </div>
                      <p style={{ color: '#cbd5e1' }}><span style={{ color: '#38bdf8', fontWeight: '600' }}>Click to upload</span> or drag & drop</p>
                      <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>PDF, TXT, DOC, DOCX (max 10MB)</p>
                    </div>
                  )}
                </label>
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#cbd5e1', marginBottom: '10px' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = '#0ea5e9'; e.target.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.25)' }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(71, 85, 105, 0.6)'; e.target.style.boxShadow = 'none' }}
              />
              <p style={{ marginTop: '8px', fontSize: '13px', color: '#64748b' }}>We'll notify you when ready</p>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px',
                background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px', marginBottom: '24px', color: '#f87171'
              }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%', padding: '16px', borderRadius: '14px',
                fontWeight: '600', fontSize: '16px', color: 'white', border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                background: isSubmitting ? 'rgba(100, 116, 139, 0.5)' : 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
                boxShadow: isSubmitting ? 'none' : '0 10px 30px -5px rgba(14, 165, 233, 0.5)',
                opacity: isSubmitting ? 0.7 : 1,
                transition: 'all 0.3s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
              }}
            >
              {isSubmitting ? (
                <><svg width="20" height="20" fill="none" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}><circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> Processing...</>
              ) : (
                <><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Summarize Now</>
              )}
            </button>
          </form>
        </div>

        {/* Features */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '48px' }}>
          {[
            { icon: '⚡', title: 'Lightning Fast', desc: '~30 seconds', bg: 'rgba(14, 165, 233, 0.1)' },
            { icon: '🤖', title: 'AI Powered', desc: 'BART-Large-CNN', bg: 'rgba(139, 92, 246, 0.1)' },
            { icon: '☁️', title: 'Serverless', desc: 'AWS Lambda', bg: 'rgba(16, 185, 129, 0.1)' }
          ].map((f, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: '24px 16px', borderRadius: '16px',
              background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(51, 65, 85, 0.4)'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{f.icon}</div>
              <h3 style={{ color: 'white', fontWeight: '600', marginBottom: '4px', fontSize: '15px' }}>{f.title}</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px' }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginTop: '48px', paddingTop: '24px', borderTop: '1px solid rgba(51, 65, 85, 0.4)' }}>
          Powered by AWS Lambda, SQS, DynamoDB & Hugging Face AI
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default HomePage
