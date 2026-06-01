import { useState, useEffect, useRef } from 'react'

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

    intervalRef.current = setInterval(async () => {
      const sr = await fetch(`/api/status/${data.orderId}`)
      if (!sr.ok) return
      const sd = (await sr.json()) as StatusResponse
      setStatus(sd.status)
      if (sd.status === 'PAID') stopPolling()
    }, 3_000)
  }

  return (
    <div style={{ fontFamily: 'monospace', padding: '2rem', maxWidth: '480px' }}>
      <h1>KHQR Payment Tester</h1>
      <form onSubmit={handleGenerate}>
        <label>
          Prefix&nbsp;
          <select value={prefix} onChange={e => setPrefix(e.target.value as Prefix)}>
            <option value="LOCAL">LOCAL</option>
            <option value="AGENT">AGENT</option>
            <option value="DIAG">DIAG</option>
          </select>
        </label>
        &nbsp;
        <label>
          Amount&nbsp;
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
          />
        </label>
        &nbsp;
        <button type="submit">Generate QR</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {orderId && (
        <div style={{ marginTop: '1rem' }}>
          <p><strong>Order ID:</strong> {orderId}</p>
          <p>
            <strong>Status:</strong>{' '}
            <span style={{ color: status === 'PAID' ? 'green' : 'orange' }}>
              {status}
            </span>
          </p>
          <p><strong>QR String:</strong></p>
          <textarea
            readOnly
            rows={4}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.75rem' }}
            value={qrString ?? ''}
          />
        </div>
      )}
    </div>
  )
}
