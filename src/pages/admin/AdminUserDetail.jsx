import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminFetch } from './utils/api.js'
import StatusBadge from '../../components/admin/StatusBadge.jsx'

const TABS = ['Profile', 'Orders', 'Transactions', 'Deposits', 'Tickets', 'API Keys']

function Modal({ title, onClose, children }) {
  return (
    <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal">
        <button className="admin-modal-close" onClick={onClose}>×</button>
        <h2 className="admin-modal-title">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export default function AdminUserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Profile')
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null) // 'password' | 'edit' | 'balance'
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  // Modal forms
  const [passwordForm, setPasswordForm] = useState({ password: '' })
  const [editForm, setEditForm] = useState({})
  const [balanceForm, setBalanceForm] = useState({ amount: '', note: '' })

  const fetchUser = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminFetch(`/admin/users/${id}`)
      setUser(data.user || data)
      setEditForm(data.user || data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchUser() }, [fetchUser])

  async function banToggle() {
    setActionLoading(true)
    try {
      await adminFetch(`/admin/users/${id}/ban`, { method: 'PATCH' })
      fetchUser()
    } catch (e) {
      alert(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function setPassword(e) {
    e.preventDefault()
    setActionLoading(true)
    setActionError('')
    try {
      await adminFetch(`/admin/users/${id}/password`, { method: 'PATCH', body: JSON.stringify(passwordForm) })
      setModal(null)
    } catch (e) {
      setActionError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function editUser(e) {
    e.preventDefault()
    setActionLoading(true)
    setActionError('')
    try {
      await adminFetch(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(editForm) })
      setModal(null)
      fetchUser()
    } catch (e) {
      setActionError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function adjustBalance(e) {
    e.preventDefault()
    setActionLoading(true)
    setActionError('')
    try {
      await adminFetch(`/admin/users/${id}/wallet/adjust`, { method: 'POST', body: JSON.stringify(balanceForm) })
      setModal(null)
      fetchUser()
    } catch (e) {
      setActionError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  function formatDate(str) {
    if (!str) return '—'
    return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) return <div style={{ padding: '40px', color: '#888' }}>Loading…</div>
  if (error) return <div style={{ color: '#dc3545', padding: '20px' }}>{error}</div>
  if (!user) return null

  const ud = user.profile || user

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => navigate('/mario-dashboard/users')} style={{ marginBottom: '8px' }}>
            ← Back to Users
          </button>
          <h1 className="admin-page-title">{user.username}</h1>
          <p className="admin-page-subtitle">
            <StatusBadge type="role" value={user.role} />
            {' '}
            <StatusBadge type="tier" value={user.tier} />
          </p>
        </div>
        <div className="admin-gap-actions">
          <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => { setModal('password'); setActionError('') }}>
            Set Password
          </button>
          <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => { setModal('edit'); setActionError('') }}>
            Edit User
          </button>
          <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => { setModal('balance'); setActionError('') }}>
            Adjust Balance
          </button>
          <button
            className={'admin-btn admin-btn-sm ' + (user.banned ? 'admin-btn-success' : 'admin-btn-danger')}
            onClick={banToggle}
            disabled={actionLoading}
          >
            {user.banned ? 'Unban' : 'Ban'}
          </button>
        </div>
      </div>

      <div className="admin-tabs">
        {TABS.map(t => (
          <button key={t} className={'admin-tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Profile' && (
        <div className="admin-grid-2">
          <div className="admin-card">
            <h2 className="admin-card-title">Account Info</h2>
            <div className="admin-info-list">
              <div className="admin-info-row"><span className="admin-info-label">Username</span><span className="admin-info-value">{user.username}</span></div>
              <div className="admin-info-row"><span className="admin-info-label">Role</span><span className="admin-info-value"><StatusBadge type="role" value={user.role} /></span></div>
              <div className="admin-info-row"><span className="admin-info-label">Tier</span><span className="admin-info-value"><StatusBadge type="tier" value={user.tier} /></span></div>
              <div className="admin-info-row"><span className="admin-info-label">Balance</span><span className="admin-info-value">${Number(user.balance || 0).toFixed(2)}</span></div>
              <div className="admin-info-row"><span className="admin-info-label">Total Spent</span><span className="admin-info-value">${Number(user.totalSpent || 0).toFixed(2)}</span></div>
              <div className="admin-info-row"><span className="admin-info-label">Status</span><span className="admin-info-value">{user.banned ? <span style={{ color: '#dc3545', fontWeight: 700 }}>Banned</span> : <span style={{ color: '#28a745', fontWeight: 700 }}>Active</span>}</span></div>
              <div className="admin-info-row"><span className="admin-info-label">Joined</span><span className="admin-info-value">{formatDate(user.createdAt)}</span></div>
            </div>
          </div>
          <div className="admin-card">
            <h2 className="admin-card-title">Contact / Profile</h2>
            <div className="admin-info-list">
              <div className="admin-info-row"><span className="admin-info-label">Telegram</span><span className="admin-info-value">{ud.telegramHandle || '—'}</span></div>
              <div className="admin-info-row"><span className="admin-info-label">Signal</span><span className="admin-info-value">{ud.signalDetails || '—'}</span></div>
              <div className="admin-info-row"><span className="admin-info-label">Session</span><span className="admin-info-value">{ud.sessionDetails || '—'}</span></div>
              <div className="admin-info-row"><span className="admin-info-label">BTC Refund</span><span className="admin-info-value"><span className="admin-code">{ud.btcRefundAddress || '—'}</span></span></div>
              <div className="admin-info-row"><span className="admin-info-label">XMR Refund</span><span className="admin-info-value"><span className="admin-code">{ud.xmrRefundAddress || '—'}</span></span></div>
              <div className="admin-info-row"><span className="admin-info-label">Markup %</span><span className="admin-info-value">{ud.markup ?? '—'}</span></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'Orders' && (
        <div className="admin-card">
          <h2 className="admin-card-title">Orders</h2>
          <TablePlaceholder cols={['Order #', 'Total', 'Status', 'Date']} rows={user.orders || []}
            renderRow={o => [
              <span className="admin-code">#{o.orderNumber || o.id?.slice(0, 8)}</span>,
              `$${Number(o.total || 0).toFixed(2)}`,
              <StatusBadge type="status" value={o.status} />,
              formatDate(o.createdAt),
            ]}
          />
        </div>
      )}

      {tab === 'Transactions' && (
        <div className="admin-card">
          <h2 className="admin-card-title">Transactions</h2>
          <TablePlaceholder cols={['Type', 'Amount', 'Note', 'Date']} rows={user.transactions || []}
            renderRow={t => [
              t.type,
              <span style={{ color: t.amount >= 0 ? '#28a745' : '#dc3545', fontWeight: 700 }}>
                {t.amount >= 0 ? '+' : ''}{Number(t.amount).toFixed(2)}
              </span>,
              t.note || '—',
              formatDate(t.createdAt),
            ]}
          />
        </div>
      )}

      {tab === 'Deposits' && (
        <div className="admin-card">
          <h2 className="admin-card-title">Deposits</h2>
          <TablePlaceholder cols={['ID', 'Currency', 'Status', 'Date']} rows={user.deposits || []}
            renderRow={d => [
              <span className="admin-code">{d.id?.slice(0, 8)}</span>,
              d.currency,
              <StatusBadge type="deposit" value={d.status} />,
              formatDate(d.createdAt),
            ]}
          />
        </div>
      )}

      {tab === 'Tickets' && (
        <div className="admin-card">
          <h2 className="admin-card-title">Support Tickets</h2>
          <TablePlaceholder cols={['Subject', 'Status', 'Priority', 'Date']} rows={user.tickets || []}
            renderRow={t => [t.subject, t.status, t.priority, formatDate(t.createdAt)]}
          />
        </div>
      )}

      {tab === 'API Keys' && (
        <div className="admin-card">
          <h2 className="admin-card-title">API Keys</h2>
          <TablePlaceholder cols={['Key', 'Created', 'Last Used']} rows={user.apiKeys || []}
            renderRow={k => [<span className="admin-code">{k.key?.slice(0, 20)}…</span>, formatDate(k.createdAt), formatDate(k.lastUsed)]}
          />
        </div>
      )}

      {/* Modals */}
      {modal === 'password' && (
        <Modal title="Set Password" onClose={() => setModal(null)}>
          {actionError && <div style={{ color: '#dc3545', marginBottom: '12px' }}>{actionError}</div>}
          <form onSubmit={setPassword}>
            <div className="admin-form-group">
              <label className="admin-label">New Password</label>
              <input className="admin-input" type="password" required value={passwordForm.password} onChange={e => setPasswordForm({ password: e.target.value })} />
            </div>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={actionLoading}>
                {actionLoading ? 'Saving…' : 'Set Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'edit' && (
        <Modal title="Edit User" onClose={() => setModal(null)}>
          {actionError && <div style={{ color: '#dc3545', marginBottom: '12px' }}>{actionError}</div>}
          <form onSubmit={editUser}>
            <div className="admin-form-group">
              <label className="admin-label">Username</label>
              <input className="admin-input" value={editForm.username || ''} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Role</label>
              <select className="admin-select" value={editForm.role || 'user'} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={actionLoading}>
                {actionLoading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'balance' && (
        <Modal title="Adjust Balance" onClose={() => setModal(null)}>
          {actionError && <div style={{ color: '#dc3545', marginBottom: '12px' }}>{actionError}</div>}
          <form onSubmit={adjustBalance}>
            <div className="admin-form-group">
              <label className="admin-label">Amount (use negative to deduct)</label>
              <input className="admin-input" type="number" step="0.01" required value={balanceForm.amount} onChange={e => setBalanceForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Note</label>
              <input className="admin-input" value={balanceForm.note} onChange={e => setBalanceForm(f => ({ ...f, note: e.target.value }))} />
            </div>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={actionLoading}>
                {actionLoading ? 'Adjusting…' : 'Adjust'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function TablePlaceholder({ cols, rows, renderRow }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>{cols.map(c => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {!rows || rows.length === 0 ? (
            <tr><td colSpan={cols.length} className="admin-table-empty">No data found.</td></tr>
          ) : rows.map((row, i) => (
            <tr key={row.id || i}>
              {renderRow(row).map((cell, j) => <td key={j}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
