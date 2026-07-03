import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext.jsx'
import { apiFetch } from '../../utils/api.js'
import styles from './SupportPage.module.css'

const CATEGORIES = ['Order Issue', 'Deposit', 'Account', 'Product', 'Other']
const PRIORITIES  = ['low', 'medium', 'high', 'urgent']

export default function SupportPage() {
  const { user } = useApp()
  const isAdmin = user && ['admin', 'moderator'].includes(user.role)

  const [form, setForm]       = useState({ subject: '', category: 'Order Issue', priority: 'medium', message: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')

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
    try {
      await apiFetch('/support/tickets', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setSuccess(true)
      setForm({ subject: '', category: 'Order Issue', priority: 'medium', message: '' })
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
              <Link to="/mario-dashboard/support" className={styles.adminBtn}>
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
                    <p>We'll review your request and get back to you shortly.</p>
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
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
                    <p>Check your ticket status in your wallet page under activity.</p>
                  </div>
                </li>
              </ol>

              <div className={styles.telegramBox}>
                <p>For urgent matters, reach us directly on Telegram:</p>
                <a
                  href="https://t.me/BESTOFTHEBAYOG"
                  target="_blank"
                  rel="noreferrer"
                  className={styles.telegramBtn}
                >
                  <svg width="18" height="18" viewBox="0 0 128 128" aria-hidden="true">
                    <path fill="currentColor" d="M28.97 63.32C47.63 55.2 60.07 49.84 66.29 47.25c17.77-7.39 21.47-8.68 23.87-8.72.53-.01 1.71.12 2.48.74.67.52.85 1.23.94 1.73.09.5.19 1.63.1 2.52-0.96 10.12-5.13 34.68-7.25 46.01-.9 4.8-2.66 6.4-4.37 6.56-3.72.34-6.54-2.46-10.14-4.82-5.63-3.69-8.81-5.99-14.28-9.59-6.32-4.16-2.22-6.45 1.38-10.19.95-.98 17.32-15.88 17.64-17.23.04-.17.07-.81-.3-1.14-.37-.33-.93-.22-1.33-.12-.56.13-9.56 6.07-26.99 17.84-2.55 1.75-4.86 2.61-6.93 2.56-2.28-.05-6.68-1.29-9.95-2.35-4.01-1.3-7.19-1.99-6.91-4.2.14-1.15 1.73-2.33 4.76-3.53z"/>
                  </svg>
                  Contact on Telegram
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
