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
  const [error, setError] = useState('')

  async function handleExpire() {
    setLoading(true)
    setError('')
    try {
      await adminFetch(`/admin/deposits/${deposit.id}/expire`, { method: 'PATCH' })
      onExpired()
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fef2f2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </div>
          <div>
            <h2 className="admin-modal-title" style={{ margin: 0 }}>Expire Deposit</h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>This action cannot be undone</p>
          </div>
        </div>

        <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
          <span style={{ color: '#888' }}>Deposit ID</span>
          <span className="admin-code">#{deposit.id}</span>
          <span style={{ color: '#888' }}>User</span>
          <span>{deposit.user?.username || deposit.userId}</span>
          <span style={{ color: '#888' }}>Currency</span>
          <span>{deposit.currency}</span>
          <span style={{ color: '#888' }}>Expected</span>
          <span>{deposit.expectedAmount ?? '—'}</span>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '8px', padding: '10px 12px', fontSize: '0.85rem', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <div className="admin-modal-actions">
          <button className="admin-btn admin-btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="admin-btn admin-btn-danger" onClick={handleExpire} disabled={loading}>
            {loading ? 'Expiring…' : 'Confirm Expire'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CleanupModal({ onClose, onDone }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCleanup() {
    setLoading(true)
    setError('')
    try {
      const data = await adminFetch('/admin/deposits/cleanup', { method: 'POST' })
      onDone(data.message || 'Cleanup completed.')
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff7ed', border: '1px solid #fdba74', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <h2 className="admin-modal-title" style={{ margin: 0 }}>Cleanup Expired Deposits</h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>BlockCypher forwards will be deleted</p>
          </div>
        </div>

        <p style={{ fontSize: '0.875rem', color: '#555', marginBottom: '16px', lineHeight: 1.5 }}>
          This will mark all pending expired deposits as <strong>expired</strong> and delete their associated BlockCypher forwarding addresses.
        </p>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '8px', padding: '10px 12px', fontSize: '0.85rem', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <div className="admin-modal-actions">
          <button className="admin-btn admin-btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="admin-btn admin-btn-danger" onClick={handleCleanup} disabled={loading}>
            {loading ? 'Cleaning up…' : 'Run Cleanup'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PurgeModal({ onClose, onDone }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handlePurge() {
    setLoading(true)
    setError('')
    try {
      const data = await adminFetch('/admin/deposits/purge-blockcypher', { method: 'POST' })
      onDone(data.message || 'Purge completed.')
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fef2f2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </div>
          <div>
            <h2 className="admin-modal-title" style={{ margin: 0 }}>Purge All BlockCypher Forwards</h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>Deletes ALL forwards, including orphans</p>
          </div>
        </div>

        <p style={{ fontSize: '0.875rem', color: '#555', marginBottom: '16px', lineHeight: 1.5 }}>
          This queries BlockCypher directly and deletes <strong>every</strong> registered forwarding address on your token (BTC, LTC, DOGE) — including ones not in your database. Use this to clear a full quota and resolve persistent 429 errors.
        </p>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '8px', padding: '10px 12px', fontSize: '0.85rem', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <div className="admin-modal-actions">
          <button className="admin-btn admin-btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="admin-btn admin-btn-danger" onClick={handlePurge} disabled={loading}>
            {loading ? 'Purging…' : 'Purge All Forwards'}
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
  const [showCleanup, setShowCleanup] = useState(false)
  const [showPurge, setShowPurge]     = useState(false)
  const [cleanupMsg, setCleanupMsg]   = useState('')
  const [reregisterLoading, setReregisterLoading] = useState({})

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

  function handleCleanupDone(msg) {
    setCleanupMsg(msg)
    fetchDeposits()
    setTimeout(() => setCleanupMsg(''), 5000)
  }

  async function handleReregisterWebhook(deposit) {
    setReregisterLoading(v => ({ ...v, [deposit.id]: true }))
    try {
      const data = await adminFetch(`/admin/deposits/${deposit.id}/reregister-webhook`, { method: 'POST' })
      setCleanupMsg(data.message || 'Webhook registered')
      fetchDeposits()
      setTimeout(() => setCleanupMsg(''), 6000)
    } catch (e) {
      setCleanupMsg('Error: ' + e.message)
      setTimeout(() => setCleanupMsg(''), 6000)
    } finally {
      setReregisterLoading(v => ({ ...v, [deposit.id]: false }))
    }
  }

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
          <strong> Auto-confirmed currencies:</strong> BTC, LTC, DOGE, ETH — credited automatically after sufficient blockchain confirmations.
        </div>
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '14px', fontSize: '0.85rem', color: '#856404' }}>
          <strong> Manual review required:</strong> XMR deposits must be manually confirmed by an admin after verifying on the blockchain.
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
        <button
          className="admin-filter-btn"
          style={{ background: '#dc3545', color: '#fff', borderColor: '#dc3545' }}
          onClick={() => setShowCleanup(true)}
          title="Delete BlockCypher forwards for all expired pending deposits"
        >
          Cleanup Expired
        </button>
        <button
          className="admin-filter-btn"
          style={{ background: '#7c3aed', color: '#fff', borderColor: '#7c3aed' }}
          onClick={() => setShowPurge(true)}
          title="Delete ALL BlockCypher forwards (including orphans not in DB)"
        >
          Purge BlockCypher
        </button>
        {cleanupMsg && (
          <span style={{ fontSize: '13px', color: '#198754', fontWeight: 500 }}>
            ✓ {cleanupMsg}
          </span>
        )}
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
                  <td><span className="admin-code">{d.id}</span></td>
                  <td>{d.user?.username || d.userId || '—'}</td>
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
                      {(d.status === 'awaiting' || d.status === 'partial') && (
                        <button className="admin-btn admin-btn-success admin-btn-sm" onClick={() => setConfirmDeposit(d)}>Confirm</button>
                      )}
                      {d.status === 'awaiting' && (
                        <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => setExpireDeposit(d)}>Expire</button>
                      )}
                      {['BTC', 'LTC', 'DOGE'].includes(d.currency) && (d.status === 'awaiting' || d.status === 'partial') && (
                        <button
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                          title={d.hookId ? `Hook: ${d.hookId}` : 'No webhook registered — click to register'}
                          style={!d.hookId ? { borderColor: '#f59e0b', color: '#b45309' } : {}}
                          onClick={() => handleReregisterWebhook(d)}
                          disabled={!!reregisterLoading[d.id]}
                        >
                          {reregisterLoading[d.id] ? '…' : d.hookId ? '↺ Hook' : '⚠ Register Hook'}
                        </button>
                      )}
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
      {showCleanup && (
        <CleanupModal onClose={() => setShowCleanup(false)} onDone={handleCleanupDone} />
      )}
      {showPurge && (
        <PurgeModal onClose={() => setShowPurge(false)} onDone={handleCleanupDone} />
      )}
    </div>
  )
}
