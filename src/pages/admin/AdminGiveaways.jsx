import { useState, useEffect, useCallback } from 'react'
import { adminFetch } from './utils/api.js'

function Modal({ title, onClose, children }) {
  return (
    <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal" style={{ maxWidth: '600px' }}>
        <button className="admin-modal-close" onClick={onClose}>×</button>
        <h2 className="admin-modal-title">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString()
}

export default function AdminGiveaways() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', endDate: '', active: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminFetch('/admin/giveaways')
      setItems(data.giveaways || data || [])
    } catch { setItems([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  function openCreate() {
    setForm({ title: '', description: '', endDate: '', active: true })
    setModal({ mode: 'create' })
    setError('')
  }
  function openEdit(item) {
    setForm({
      title: item.title,
      description: item.description || '',
      endDate: item.endDate ? item.endDate.slice(0, 10) : '',
      active: !!item.active,
    })
    setModal({ mode: 'edit', item })
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined }
      if (modal.mode === 'create') {
        await adminFetch('/admin/giveaways', { method: 'POST', body: JSON.stringify(payload) })
      } else {
        await adminFetch(`/admin/giveaways/${modal.item.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      }
      setModal(null)
      fetchItems()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Giveaways</h1>
          <p className="admin-page-subtitle">Manage giveaway campaigns</p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={openCreate}>+ Add Giveaway</button>
      </div>

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Title</th><th>Status</th><th>End Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 4 }).map((_, j) => <td key={j}><span className="admin-skel" style={{ width: '80px', height: '16px' }} /></td>)}</tr>
                ))
              ) : items.length === 0 ? (
                <tr><td colSpan={4} className="admin-table-empty">No data found.</td></tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.title}</strong></td>
                  <td>
                    <span className="admin-badge" style={{ background: item.active ? '#d4edda' : '#e9ecef', color: item.active ? '#155724' : '#6c757d' }}>
                      {item.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{formatDate(item.endDate)}</td>
                  <td>
                    <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => openEdit(item)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'Add Giveaway' : 'Edit Giveaway'} onClose={() => setModal(null)}>
          {error && <div style={{ color: '#dc3545', marginBottom: '12px' }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="admin-form-group">
              <label className="admin-label">Title</label>
              <input className="admin-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Description</label>
              <textarea className="admin-textarea" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">End Date</label>
              <input className="admin-input" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div className="admin-form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                <span className="admin-label" style={{ margin: 0 }}>Active</span>
              </label>
            </div>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
