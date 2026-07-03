import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminFetch } from './utils/api.js'

export default function AdminSupportDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchTicket = useCallback(async () => {
    try {
      const data = await adminFetch(`/admin/support/tickets/${id}`)
      const t = data.ticket || data
      setTicket(t)
      setMessages(t.messages || data.messages || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchTicket() }, [fetchTicket])

  async function sendReply(e) {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    try {
      await adminFetch(`/admin/support/tickets/${id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: reply }),
      })
      setReply('')
      fetchTicket()
    } catch (e) {
      alert(e.message)
    } finally {
      setSending(false)
    }
  }

  async function toggleStatus() {
    const newStatus = ticket?.status === 'open' ? 'closed' : 'open'
    setStatusLoading(true)
    try {
      await adminFetch(`/admin/support/tickets/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      })
      fetchTicket()
    } catch (e) {
      alert(e.message)
    } finally {
      setStatusLoading(false)
    }
  }

  function formatDate(str) {
    if (!str) return '—'
    return new Date(str).toLocaleString()
  }

  if (loading) return <div style={{ padding: '40px', color: '#888' }}>Loading…</div>
  if (error) return <div style={{ color: '#dc3545', padding: '20px' }}>{error}</div>
  if (!ticket) return null

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => navigate('/mario-dashboard/support')} style={{ marginBottom: '8px' }}>
            ← Back to Tickets
          </button>
          <h1 className="admin-page-title">{ticket.subject}</h1>
          <p className="admin-page-subtitle">
            From: <strong>{ticket.user?.username || '—'}</strong> · {formatDate(ticket.createdAt)}
          </p>
        </div>
        <div className="admin-gap-actions">
          <span className="admin-badge" style={{ background: ticket.status === 'open' ? '#d4edda' : '#e9ecef', color: ticket.status === 'open' ? '#155724' : '#6c757d' }}>
            {ticket.status || 'open'}
          </span>
          <button
            className={'admin-btn admin-btn-sm ' + (ticket.status === 'open' ? 'admin-btn-danger' : 'admin-btn-success')}
            onClick={toggleStatus}
            disabled={statusLoading}
          >
            {ticket.status === 'open' ? 'Close Ticket' : 'Reopen Ticket'}
          </button>
        </div>
      </div>

      {/* Message thread */}
      <div className="admin-card">
        <h2 className="admin-card-title">Messages</h2>
        {messages.length === 0 ? (
          <p style={{ color: '#888', fontStyle: 'italic' }}>No messages yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map((m, i) => {
              const isAdmin = m.isAdmin || m.role === 'admin' || m.role === 'moderator'
              return (
                <div key={m.id || i} style={{
                  padding: '14px',
                  borderRadius: '8px',
                  background: isAdmin ? '#f0f4ff' : '#f8fafc',
                  border: `1px solid ${isAdmin ? '#c8d4ff' : '#e8ecf0'}`,
                  alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '6px' }}>
                    <strong style={{ color: isAdmin ? '#4361ee' : '#333' }}>{isAdmin ? 'Support Agent' : m.user?.username || 'User'}</strong>
                    {' · '}{formatDate(m.createdAt)}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#333', whiteSpace: 'pre-wrap' }}>{m.message || m.content}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Reply form */}
      <div className="admin-card">
        <h2 className="admin-card-title">Reply</h2>
        <form onSubmit={sendReply}>
          <div className="admin-form-group">
            <textarea
              className="admin-textarea"
              rows={4}
              placeholder="Type your reply…"
              value={reply}
              onChange={e => setReply(e.target.value)}
            />
          </div>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={sending || !reply.trim()}>
            {sending ? 'Sending…' : 'Send Reply'}
          </button>
        </form>
      </div>
    </div>
  )
}
