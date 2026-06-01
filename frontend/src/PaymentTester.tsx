import { useState, useEffect, useRef } from 'react'
import { QRCodeDisplay } from './QRCodeDisplay'

type Prefix = 'LOCAL' | 'AGENT' | 'DIAG'
type Status = 'PENDING' | 'PAID'

interface GenerateResponse {
  orderId: string
  qrString: string
}

interface StatusResponse {
  orderId: string
  status: Status
}

export function PaymentTester() {
  const [prefix, setPrefix] = useState<Prefix>('LOCAL')
  const [amount, setAmount] = useState('')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [qrString, setQrString] = useState<string | null>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resultPayload, setResultPayload] = useState<StatusResponse | null>(null)
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const genRef = useRef(0)

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOrderId(null)
    setQrString(null)
    setStatus(null)
    setResultPayload(null)
    stopPolling()

    const parsed = parseFloat(amount)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Amount must be a positive number')
      return
    }

    const res = await fetch('/api/generate-khqr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPrefix: prefix, amount: parsed }),
    })

    if (!res.ok) {
      setError(`Generate failed: ${res.status}`)
      return
    }

    const data = (await res.json()) as GenerateResponse
    setOrderId(data.orderId)
    setQrString(data.qrString)
    setStatus('PENDING')

    const gen = ++genRef.current
    intervalRef.current = setInterval(async () => {
      if (gen !== genRef.current) return
      const sr = await fetch(`/api/status/${data.orderId}`)
      if (!sr.ok) return
      const sd = (await sr.json()) as StatusResponse
      setStatus(sd.status)
      if (sd.status === 'PAID') {
        setResultPayload(sd)
        stopPolling()
      }
    }, 3_000)
  }

  return (
    <div className="glass-card">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>Payment Gateway</h1>
        <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>Generate KHQR & Test Webhooks</p>
      </div>
      
      {!status && (
        <form onSubmit={handleGenerate} className="fade-in">
          <div className="input-group">
            <label className="input-label">Project Prefix</label>
            <select 
              className="input-field" 
              value={prefix} 
              onChange={e => setPrefix(e.target.value as Prefix)}
            >
              <option value="LOCAL">LOCAL</option>
              <option value="AGENT">AGENT</option>
              <option value="DIAG">DIAG</option>
            </select>
          </div>
          
          <div className="input-group">
            <label className="input-label">Amount (USD)</label>
            <input
              className="input-field"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 1.50"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="btn-primary">Generate KHQR</button>
        </form>
      )}

      {error && <p style={{ color: '#ef4444', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

      {status === 'PENDING' && orderId && (
        <div className="fade-in" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 'bold' }}>
              WAITING FOR PAYMENT
            </span>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Order ID: {orderId}</p>
          </div>
          <QRCodeDisplay qrString={qrString ?? ''} size={256} />
          
          <button 
            onClick={() => setStatus(null)} 
            style={{ marginTop: '1.5rem', background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Cancel & Go Back
          </button>
        </div>
      )}

      {status === 'PAID' && resultPayload && (
        <div className="success-box">
          <div style={{ 
            width: '64px', height: '64px', background: 'var(--success)', 
            borderRadius: '50%', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', margin: '0 auto 1.5rem',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2 style={{ margin: '0 0 0.5rem', color: 'white' }}>Payment Successful!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Your bank transfer was received and verified.</p>
          
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 'bold', margin: '0 0 0.5rem', textAlign: 'left' }}>Backend Status Result:</p>
            <pre className="json-preview">
              {JSON.stringify(resultPayload, null, 2)}
            </pre>
          </div>
          
          <button 
            onClick={() => setStatus(null)} 
            className="btn-primary" 
            style={{ background: 'var(--bg-dark)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Create New Payment
          </button>
        </div>
      )}
    </div>
  )
}
