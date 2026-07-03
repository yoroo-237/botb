import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { apiFetch } from '../../utils/api.js'
import styles from './ProfilePage.module.css'

const SECTIONS = [
  {
    key: 'private',
    title: 'Private Details',
    fields: [
      { name: 'username', label: 'Username', readOnly: true },
      { name: 'markup', label: 'Markup %', type: 'number' },
    ],
  },
  {
    key: 'signal',
    title: 'Signal Details',
    fields: [{ name: 'signalDetails', label: 'Signal Handle' }],
  },
  {
    key: 'session',
    title: 'Session Details',
    fields: [{ name: 'sessionDetails', label: 'Session ID' }],
  },
  {
    key: 'btcRefund',
    title: 'BTC Refund Address',
    fields: [{ name: 'btcRefundAddress', label: 'Bitcoin Address' }],
  },
  {
    key: 'xmrRefund',
    title: 'XMR Refund Address',
    fields: [{ name: 'xmrRefundAddress', label: 'Monero Address' }],
  },
  {
    key: 'telegram',
    title: 'Telegram Details',
    fields: [{ name: 'telegramHandle', label: 'Telegram Handle' }],
    hasTelegramBtn: true,
  },
]

function ProfileSection({ section, profileData, onSave }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (profileData) {
      const initial = {}
      section.fields.forEach(f => { initial[f.name] = profileData[f.name] ?? '' })
      setForm(initial)
    }
  }, [profileData, section.fields])

  function startEdit() {
    const current = {}
    section.fields.forEach(f => { current[f.name] = profileData?.[f.name] ?? '' })
    setForm(current)
    setEditing(true)
    setSuccess('')
    setError('')
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const updatable = {}
      section.fields.filter(f => !f.readOnly).forEach(f => { updatable[f.name] = form[f.name] })
      await onSave(updatable)
      setSuccess('Saved successfully.')
      setEditing(false)
    } catch (err) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>{section.title}</h3>
        {!editing ? (
          <button className={styles.editBtn} onClick={startEdit}>Edit</button>
        ) : (
          <div className={styles.btnActions}>
            <button className={styles.cancelBtn} onClick={() => { setEditing(false); setSuccess('') }}>Cancel</button>
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {success && <div className={styles.success}>{success}</div>}
      {error && <div className={styles.errorMsg}>{error}</div>}

      {section.fields.map(field => (
        <div key={field.name} className={styles.fieldRow}>
          <span className={styles.fieldLabel}>{field.label}</span>
          {editing && !field.readOnly ? (
            <input
              type={field.type || 'text'}
              className={styles.fieldInput}
              value={form[field.name] || ''}
              onChange={e => setForm(f => ({ ...f, [field.name]: e.target.value }))}
              placeholder={field.label}
            />
          ) : (
            <span className={styles.fieldValue + (field.readOnly ? ' ' + styles.readOnly : '')}>
              {profileData?.[field.name] || <em style={{ color: '#bbb' }}>Not set</em>}
            </span>
          )}
        </div>
      ))}

      {section.hasTelegramBtn && (
        <button className={styles.telegramBtn} onClick={() => alert('Telegram linking coming soon')}>
          Auto-Link Account
        </button>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const { user, balance } = useApp()
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchProfile = useCallback(async () => {
    try {
      const data = await apiFetch('/profile')
      setProfileData(data.profile || data)
    } catch (err) {
      setError(err.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  async function handleSave(updates) {
    const data = await apiFetch('/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    setProfileData(prev => ({ ...prev, ...updates }))
    return data
  }

  const initial = user?.username?.charAt(0)?.toUpperCase() || 'U'

  return (
    <main className="site-main" style={{ padding: 0 }}>
      <div className={styles.header}>
        <div className="alignwide">
          <div className={styles.headerInner}>
            <div className={styles.avatar}>{initial}</div>
            <div className={styles.userInfo}>
              <div className={styles.username}>{user?.username || 'User'}</div>
              <div className={styles.meta}>
                {user?.tier && (
                  <span className={styles.tierBadge}>{user.tier}</span>
                )}
                <span className={styles.balanceChip}>${balance.toFixed(2)} balance</span>
                {user?.role && user.role !== 'user' && (
                  <span className={styles.tierBadge} style={{ background: 'rgba(255,100,0,0.4)' }}>
                    {user.role}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="alignwide" style={{ paddingTop: '32px', paddingBottom: '60px', paddingLeft: 'var(--root-padding)', paddingRight: 'var(--root-padding)' }}>
        {loading ? (
          <div className={styles.loading}>Loading profile…</div>
        ) : error ? (
          <div className={styles.errorMsg}>{error}</div>
        ) : (
          <div className={styles.grid}>
            {SECTIONS.map(section => (
              <ProfileSection
                key={section.key}
                section={section}
                profileData={profileData}
                onSave={handleSave}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
