import { useState, useEffect, useCallback } from 'react'
import { adminFetch } from './utils/api.js'
import StatusBadge from '../../components/admin/StatusBadge.jsx'
import Pagination from '../../components/admin/Pagination.jsx'

const CURRENCY_COLORS = {
  BTC: '#f7931a', LTC: '#345d9d', DOGE: '#c2a633', ETH: '#627eea', XMR: '#ff6600',
}

function CurrencyBadge({ value }) {
  const color = CURRENCY_COLORS[value] || '#888'
  return (
    <span className="admin-badge" style={{ background: color + '22', color, border: `1px solid ${color}66` }}>
      {value}
    </span>
  )
}

function ConfirmModal({ deposit, onClose, onConfirmed }) {
  const [form, setForm] = useState({ usdAmount: '', note: '', xmrChecks: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm(e) {
    e.preventDefault()
    if (deposit.currency === 'XMR' && !form.xmrChecks) {
      setError('Please confirm XMR checklist')
      return
    }
    setLoading(true)
    setError('')
    try {
      await adminFetch(`/admin/deposits/${deposit.id}/confirm`, {
        method: 'PATCH',
        body: JSON.stringify({ usdAmount: parseFloat(form.usdAmount), note: form.note }),
      })
      onConfirmed()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal">
        <button className="admin-modal-close" onClick={onClose}>×</button>
        <h2 className="admin-modal-title">Confirm Deposit</h2>
        {error && <div style={{ color: '#dc3545', marginBottom: '12px', fontSize: '0.875rem' }}>{error}</div>}

        {deposit.currency === 'XMR' && (
          <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '0.85rem' }}>
            <strong>XMR Manual Checklist</strong>
            <label style={{ display: 'flex', gap: '8px', marginTop: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.xmrChecks} onChange={e => setForm(f => ({ ...f, xmrChecks: e.target.checked }))} />
              I have verified the XMR transaction on the blockchain and confirmed the received amount.
            </label>
          </div>
        )}

        <form onSubmit={handleConfirm}>
          <div className="admin-form-group">
            <label className="admin-label">USD Amount to Credit</label>
            <input className="admin-input" type="number" step="0.01" required value={form.usdAmount} onChange={e => setForm(f => ({ ...f, usdAmount: e.target.value }))} />
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Note (optional)</label>
            <input className="admin-input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          </div>
          <div className="admin-modal-actions">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="admin-btn admin-btn-success" disabled={loading}>
              {loading ? 'Confirming…' : 'Confirm Deposit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ExpireModal({ deposit, onClose, onExpired }) {
  const [loading, setLoading] = useState(false)

  async function handleExpire() {
    setLoading(true)
    try {
      await adminFetch(`/admin/deposits/${deposit.id}/expire`, { method: 'PATCH' })
      onExpired()
      onClose()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal">
        <button className="admin-modal-close" onClick={onClose}>×</button>
        <h2 className="admin-modal-title">Expire Deposit</h2>
        <p>Are you sure you want to mark this deposit as expired? This action cannot be undone.</p>
        <div className="admin-modal-actions">
          <button className="admin-btn admin-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="admin-btn admin-btn-danger" onClick={handleExpire} disabled={loading}>
            {loading ? 'Expiring…' : 'Expire Deposit'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [status, setStatus] = useState('')
  const [currency, setCurrency] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirmDeposit, setConfirmDeposit] = useState(null)
  const [expireDeposit, setExpireDeposit] = useState(null)

  const fetchDeposits = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 20 })
      if (status) params.set('status', status)
      if (currency) params.set('currency', currency)
      const data = await adminFetch(`/admin/deposits?${params}`)
      setDeposits(data.deposits || data || [])
      setTotalPages(data.totalPages || 1)
    } catch {
      setDeposits([])
    } finally {
      setLoading(false)
    }
  }, [page, status, currency])

  useEffect(() => { fetchDeposits() }, [fetchDeposits])

  function formatDate(str) {
    if (!str) return '—'
    return new Date(str).toLocaleString()
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Deposits</h1>
          <p className="admin-page-subtitle">Manage crypto deposits</p>
        </div>
      </div>

      {/* Info panels */}
      <div className="admin-grid-2" style={{ marginBottom: '20px' }}>
        <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '8px', padding: '14px', fontSize: '0.85rem', color: '#155724' }}>
          <strong>⚡ Auto-confirmed currencies:</strong> BTC, LTC, DOGE, ETH — credited automatically after sufficient blockchain confirmations.
        </div>
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '14px', fontSize: '0.85rem', color: '#856404' }}>
          <strong>👤 Manual review required:</strong> XMR deposits must be manually confirmed by an admin after verifying on the blockchain.
        </div>
      </div>

      <div className="admin-filters">
        <select className="admin-filter-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All Statuses</option>
          <option value="awaiting">Awaiting</option>
          <option value="confirmed">Confirmed</option>
          <option value="expired">Expired</option>
          <option value="partial">Partial</option>
        </select>
        <select className="admin-filter-select" value={currency} onChange={e => { setCurrency(e.target.value); setPage(1) }}>
          <option value="">All Currencies</option>
          <option value="BTC">BTC</option>
          <option value="LTC">LTC</option>
          <option value="DOGE">DOGE</option>
          <option value="ETH">ETH</option>
          <option value="XMR">XMR</option>
        </select>
        <button className="admin-filter-btn" onClick={fetchDeposits}>Refresh</button>
      </div>

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Currency</th>
                <th>Address</th>
                <th>Expected</th>
                <th>Received</th>
                <th>USD Credited</th>
                <th>Status</th>
                <th>Expires</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 11 }).map((_, j) => (
                      <td key={j}><span className="admin-skel" style={{ width: '70px', height: '16px' }} /></td>
                    ))}
                  </tr>
                ))
              ) : deposits.length === 0 ? (
                <tr><td colSpan={11} className="admin-table-empty">No data found.</td></tr>
              ) : deposits.map(d => (
                <tr key={d.id}>
                  <td><span className="admin-code">{d.id?.slice(0, 8)}</span></td>
                  <td>{d.user?.username || d.userId?.slice(0, 8) || '—'}</td>
                  <td><CurrencyBadge value={d.currency} /></td>
                  <td><span className="admin-code" title={d.address}>{d.address?.slice(0, 14)}…</span></td>
                  <td>{d.expectedAmount ?? '—'}</td>
                  <td>{d.receivedAmount ?? '—'}</td>
                  <td>{d.usdCredited ? `$${Number(d.usdCredited).toFixed(2)}` : '—'}</td>
                  <td><StatusBadge type="deposit" value={d.status} /></td>
                  <td>{d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : '—'}</td>
                  <td>{formatDate(d.createdAt)}</td>
                  <td>
                    <div className="admin-gap-actions">
                      {d.status === 'awaiting' || d.status === 'partial' ? (
                        <button className="admin-btn admin-btn-success admin-btn-sm" onClick={() => setConfirmDeposit(d)}>Confirm</button>
                      ) : null}
                      {d.status === 'awaiting' ? (
                        <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => setExpireDeposit(d)}>Expire</button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      {confirmDeposit && (
        <ConfirmModal deposit={confirmDeposit} onClose={() => setConfirmDeposit(null)} onConfirmed={fetchDeposits} />
      )}
      {expireDeposit && (
        <ExpireModal deposit={expireDeposit} onClose={() => setExpireDeposit(null)} onExpired={fetchDeposits} />
      )}
    </div>
  )
}
