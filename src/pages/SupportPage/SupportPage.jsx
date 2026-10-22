import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext.jsx'
import { apiFetch } from '../../utils/api.js'
import { isStaff } from '../../utils/roles.js'
import styles from './SupportPage.module.css'

// Values accepted by the backend (SupportTicket.category / .priority)
const CATEGORIES = [
  { value: 'order',   label: 'Order Issue' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'account', label: 'Account' },
  { value: 'other',   label: 'Other' },
]
const PRIORITIES = ['low', 'normal', 'high', 'urgent']
const EMPTY_FORM = { subject: '', category: 'order', priority: 'normal', message: '' }

const STATUS_LABEL = { open: 'Open', in_progress: 'Answered', resolved: 'Resolved', closed: 'Closed' }
const isClosed = t => ['resolved', 'closed'].includes(t.status)

function formatDate(str) {
  return str ? new Date(str).toLocaleString() : ''
}

function TicketThread({ ticketId, onChanged }) {
  const [ticket, setTicket] = useState(null)
  const [error, setError] = useState('')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(() => {
    apiFetch(`/tickets/${ticketId}`).then(setTicket).catch(e => setError(e.message))
  }, [ticketId])

  useEffect(() => { load() }, [load])

  async function sendReply(e) {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    setError('')
    try {
      await apiFetch(`/tickets/${ticketId}/messages`, { method: 'POST', body: JSON.stringify({ message: reply }) })
      setReply('')
      load()
      onChanged?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (error && !ticket) return <div className={styles.errorBox}>{error}</div>
  if (!ticket) return <p className={styles.muted}>Loading…</p>

  return (
    <div className={styles.thread}>
      {ticket.messages.map(m => (
        <div key={m.id} className={styles.message + (m.isAdmin ? ' ' + styles.messageStaff : '')}>
          <div className={styles.messageMeta}>
            <strong>{m.isAdmin ? 'Support' : 'You'}</strong> · {formatDate(m.createdAt)}
          </div>
          <div className={styles.messageText}>{m.message}</div>
        </div>
      ))}
      {isClosed(ticket) ? (
        <p className={styles.muted}>This ticket is {ticket.status}. Open a new ticket if you still need help.</p>
      ) : (
        <form onSubmit={sendReply} className={styles.form} style={{ gap: '10px' }}>
          {error && <div className={styles.errorBox}>{error}</div>}
          <textarea
            className={styles.textarea}
            rows={3}
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Write a reply…"
            aria-label="Reply"
          />
          <button type="submit" className={styles.submitBtn} disabled={sending || !reply.trim()}>
            {sending ? 'Sending…' : 'Send Reply'}
          </button>
        </form>
      )}
    </div>
  )
}

export default function SupportPage() {
  const { user } = useApp()
  const isAdmin = isStaff(user)

  const [form, setForm]       = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')

  const [tickets, setTickets]               = useState([])
  const [ticketsLoading, setTicketsLoading] = useState(true)
  const [openTicket, setOpenTicket]         = useState(null)

  const loadTickets = useCallback(() => {
    apiFetch('/tickets')
      .then(d => setTickets(Array.isArray(d) ? d : []))
      .catch(() => setTickets([]))
      .finally(() => setTicketsLoading(false))
  }, [])

  useEffect(() => { loadTickets() }, [loadTickets])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.subject.trim() || !form.message.trim()) {
      setError('Subject and message are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const created = await apiFetch('/tickets', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setSuccess(true)
      setForm(EMPTY_FORM)
      setOpenTicket(created?.id ?? null)
      loadTickets()
    } catch (err) {
      setError(err.message || 'Failed to submit ticket.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="site-main">
      <div className="alignwide">
        <div className={styles.page}>

          {/* Header row */}
          <div className={styles.topRow}>
            <div>
              <h1 className={styles.title}>Support</h1>
              <p className={styles.subtitle}>Need help? Open a ticket and our team will get back to you.</p>
            </div>

            {/* Admin-only button */}
            {isAdmin && (
              <Link to="/duc-dashboard/support" className={styles.adminBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
                Admin Dashboard
              </Link>
            )}
          </div>

          <div className={styles.layout}>
            {/* Ticket form */}
            <div className={styles.formCard}>
              <h2 className={styles.cardTitle}>Open a Ticket</h2>

              {success ? (
                <div className={styles.successBox}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <div>
                    <strong>Ticket submitted!</strong>
                    <p>We'll review your request and reply below, in “My Tickets”.</p>
                  </div>
                  <button className={styles.newTicketBtn} onClick={() => setSuccess(false)}>Open another</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className={styles.form}>
                  {error && <div className={styles.errorBox}>{error}</div>}

                  <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="subject">Subject</label>
                    <input
                      id="subject" name="subject" type="text"
                      className={styles.input} value={form.subject}
                      onChange={handleChange} placeholder="Briefly describe your issue"
                    />
                  </div>

                  <div className={styles.row}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label} htmlFor="category">Category</label>
                      <select id="category" name="category" className={styles.select} value={form.category} onChange={handleChange}>
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label} htmlFor="priority">Priority</label>
                      <select id="priority" name="priority" className={styles.select} value={form.priority} onChange={handleChange}>
                        {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="message">Message</label>
                    <textarea
                      id="message" name="message"
                      className={styles.textarea} value={form.message}
                      onChange={handleChange} rows={5}
                      placeholder="Describe your issue in detail…"
                    />
                  </div>

                  <button type="submit" className={styles.submitBtn} disabled={loading}>
                    {loading ? 'Submitting…' : 'Submit Ticket'}
                  </button>
                </form>
              )}
            </div>

            {/* Info card */}
            <div className={styles.infoCard}>
              <h2 className={styles.cardTitle}>How it works</h2>
              <ol className={styles.steps}>
                <li className={styles.step}>
                  <span className={styles.stepNum}>1</span>
                  <div>
                    <strong>Open a ticket</strong>
                    <p>Fill in the form with a clear subject and description.</p>
                  </div>
                </li>
                <li className={styles.step}>
                  <span className={styles.stepNum}>2</span>
                  <div>
                    <strong>We review it</strong>
                    <p>Our team will look into your request within 24 hours.</p>
                  </div>
                </li>
                <li className={styles.step}>
                  <span className={styles.stepNum}>3</span>
                  <div>
                    <strong>Resolution</strong>
                    <p>Follow the replies and answer us in “My Tickets” on this page.</p>
                  </div>
                </li>
              </ol>

              <div className={styles.telegramBox}>
                <p>For urgent matters, reach us directly:</p>
                <div className={styles.contactBtns}>
                  <a
                    href="https://t.me/BESTOFTHEBAYOGDM1"
                    target="_blank"
                    rel="noreferrer"
                    className={styles.telegramBtn}
                  >
                    <svg width="18" height="18" viewBox="0 0 128 128" aria-hidden="true">
                      <path fill="currentColor" d="M28.97 63.32C47.63 55.2 60.07 49.84 66.29 47.25c17.77-7.39 21.47-8.68 23.87-8.72.53-.01 1.71.12 2.48.74.67.52.85 1.23.94 1.73.09.5.19 1.63.1 2.52-0.96 10.12-5.13 34.68-7.25 46.01-.9 4.8-2.66 6.4-4.37 6.56-3.72.34-6.54-2.46-10.14-4.82-5.63-3.69-8.81-5.99-14.28-9.59-6.32-4.16-2.22-6.45 1.38-10.19.95-.98 17.32-15.88 17.64-17.23.04-.17.07-.81-.3-1.14-.37-.33-.93-.22-1.33-.12-.56.13-9.56 6.07-26.99 17.84-2.55 1.75-4.86 2.61-6.93 2.56-2.28-.05-6.68-1.29-9.95-2.35-4.01-1.3-7.19-1.99-6.91-4.2.14-1.15 1.73-2.33 4.76-3.53z"/>
                    </svg>
                    Telegram
                  </a>
                  <a
                    href="https://signal.me/#eu/GvtI_xbtlVnWQt5Edv6s9dZpfzwKKg3DBrB75lAg0cm77xCeHOlAqI8hBcjaO9pj"
                    target="_blank"
                    rel="noreferrer"
                    className={styles.signalBtn}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                      <path d="M12 1.5C6.201 1.5 1.5 5.696 1.5 10.875c0 2.788 1.397 5.284 3.594 6.987L3.75 22.5l5.484-2.447A11.45 11.45 0 0 0 12 20.25c5.799 0 10.5-4.196 10.5-9.375S17.799 1.5 12 1.5z"/>
                    </svg>
                    Signal
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.formCard} style={{ marginTop: 'var(--spacing-40)' }}>
            <h2 className={styles.cardTitle}>My Tickets</h2>
            {ticketsLoading ? (
              <p className={styles.muted}>Loading…</p>
            ) : tickets.length === 0 ? (
              <p className={styles.muted}>You have no support tickets yet.</p>
            ) : (
              <ul className={styles.ticketList}>
                {tickets.map(t => (
                  <li key={t.id} className={styles.ticketItem}>
                    <button
                      type="button"
                      className={styles.ticketHead}
                      onClick={() => setOpenTicket(id => (id === t.id ? null : t.id))}
                      aria-expanded={openTicket === t.id}
                    >
                      <span className={styles.ticketSubject}>
                        <code>{t.frontendId}</code> {t.subject}
                      </span>
                      <span className={styles.ticketMeta}>
                        <span className={styles.ticketStatus + ' ' + (styles[`status_${t.status}`] || '')}>
                          {STATUS_LABEL[t.status] || t.status}
                        </span>
                        {new Date(t.updatedAt || t.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                    {openTicket === t.id && <TicketThread ticketId={t.id} onChanged={loadTickets} />}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
