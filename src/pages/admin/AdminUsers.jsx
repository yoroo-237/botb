import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminFetch } from './utils/api.js'
import StatusBadge from '../../components/admin/StatusBadge.jsx'
import Pagination from '../../components/admin/Pagination.jsx'

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ username: '', password: '', role: 'user' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await adminFetch('/admin/users', { method: 'POST', body: JSON.stringify(form) })
      onCreated()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal">
        <button className="admin-modal-close" onClick={onClose}>×</button>
        <h2 className="admin-modal-title">Create User</h2>
        {error && <div style={{ color: '#dc3545', marginBottom: '12px', fontSize: '0.875rem' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label className="admin-label">Username</label>
            <input className="admin-input" required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Password</label>
            <input className="admin-input" type="password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Role</label>
            <select className="admin-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="admin-modal-actions">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 20 })
      if (search) params.set('search', search)
      if (tier) params.set('tier', tier)
      const data = await adminFetch(`/admin/users?${params}`)
      setUsers(data.users || data || [])
      setTotalPages(data.totalPages || 1)
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [page, search, tier])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  function formatDate(str) {
    if (!str) return '—'
    return new Date(str).toLocaleDateString()
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Users</h1>
          <p className="admin-page-subtitle">Manage user accounts</p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowCreate(true)}>
          + Create User
        </button>
      </div>

      <div className="admin-filters">
        <input
          className="admin-filter-input"
          placeholder="Search username…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
        <select className="admin-filter-select" value={tier} onChange={e => { setTier(e.target.value); setPage(1) }}>
          <option value="">All Tiers</option>
          <option value="bronze">Bronze</option>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
          <option value="platinum">Platinum</option>
          <option value="diamond">Diamond</option>
        </select>
        <button className="admin-filter-btn" onClick={fetchUsers}>Refresh</button>
      </div>

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Tier</th>
                <th>Balance</th>
                <th>Orders</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><span className="admin-skel" style={{ width: '80px', height: '16px' }} /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="admin-table-empty">No data found.</td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="admin-flex">
                      <div className="admin-avatar">{u.username?.charAt(0)?.toUpperCase()}</div>
                      <span>{u.username}</span>
                    </div>
                  </td>
                  <td><StatusBadge type="role" value={u.role} /></td>
                  <td><StatusBadge type="tier" value={u.tier} /></td>
                  <td>${Number(u.balance || 0).toFixed(2)}</td>
                  <td>{u.orderCount ?? u.orders ?? '—'}</td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>
                    <button
                      className="admin-btn admin-btn-secondary admin-btn-sm"
                      onClick={() => navigate(`/mario-dashboard/users/${u.id}`)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      {showCreate && (
        <CreateUserModal onClose={() => setShowCreate(false)} onCreated={fetchUsers} />
      )}
    </div>
  )
}
