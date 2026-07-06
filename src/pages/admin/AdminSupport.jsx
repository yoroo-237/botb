import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminFetch } from './utils/api.js'
import Pagination from '../../components/admin/Pagination.jsx'

const STATUS_STYLE = {
  open:   { bg: '#d4edda', color: '#155724' },
  closed: { bg: '#e9ecef', color: '#6c757d' },
  pending:{ bg: '#fff3cd', color: '#856404' },
}
const PRIORITY_STYLE = {
  low:    { bg: '#e9ecef', color: '#555' },
  medium: { bg: '#fff3cd', color: '#856404' },
  high:   { bg: '#f8d7da', color: '#721c24' },
  urgent: { bg: '#dc3545', color: '#fff' },
}

export default function AdminSupport() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminFetch(`/admin/support/tickets?page=${page}&limit=20`)
      setTickets(data.tickets || data || [])
      setTotalPages(data.totalPages || 1)
    } catch {
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  function formatDate(str) {
    if (!str) return '—'
    return new Date(str).toLocaleDateString()
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Support Tickets</h1>
          <p className="admin-page-subtitle">Manage customer support tickets</p>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>User</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}><span className="admin-skel" style={{ width: '80px', height: '16px' }} /></td>
                    ))}
                  </tr>
                ))
              ) : tickets.length === 0 ? (
                <tr><td colSpan={6} className="admin-table-empty">No data found.</td></tr>
              ) : tickets.map(t => {
                const ss = STATUS_STYLE[t.status?.toLowerCase()] || { bg: '#e9ecef', color: '#555' }
                const ps = PRIORITY_STYLE[t.priority?.toLowerCase()] || { bg: '#e9ecef', color: '#555' }
                return (
                  <tr key={t.id}>
                    <td>{t.subject || '—'}</td>
                    <td>{t.user?.username || '—'}</td>
                    <td><span className="admin-badge" style={{ background: ss.bg, color: ss.color }}>{t.status}</span></td>
                    <td><span className="admin-badge" style={{ background: ps.bg, color: ps.color }}>{t.priority}</span></td>
                    <td>{formatDate(t.createdAt)}</td>
                    <td>
                      <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => navigate(`/duc-dashboard/support/${t.id}`)}>
                        View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  )
}
