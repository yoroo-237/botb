import { useState, useEffect, useCallback } from 'react'
import { adminFetch } from './utils/api.js'
import Pagination from '../../components/admin/Pagination.jsx'

function EditModal({ product, onClose, onSaved }) {
  const [form, setForm] = useState({ name: product.name || '', price: product.price ?? '', stock: product.stock ?? '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await adminFetch(`/admin/products/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: form.name, price: parseFloat(form.price), stock: parseInt(form.stock) }),
      })
      onSaved()
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
        <h2 className="admin-modal-title">Edit Product</h2>
        {error && <div style={{ color: '#dc3545', marginBottom: '12px' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label className="admin-label">Name</label>
            <input className="admin-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Price ($)</label>
            <input className="admin-input" type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Stock</label>
            <input className="admin-input" type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
          </div>
          <div className="admin-modal-actions">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [editProduct, setEditProduct] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminFetch(`/products?page=${page}&limit=20`)
      setProducts(data.products || data || [])
      setTotalPages(data.totalPages || 1)
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Products</h1>
          <p className="admin-page-subtitle">Manage product catalog</p>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}><span className="admin-skel" style={{ width: '70px', height: '16px' }} /></td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr><td colSpan={6} className="admin-table-empty">No data found.</td></tr>
              ) : products.map(p => (
                <tr key={p.id}>
                  <td>
                    {p.image || p.thumbnail ? (
                      <img src={p.image || p.thumbnail} alt={p.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', background: '#e8ecf0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#ccc' }}>?</div>
                    )}
                  </td>
                  <td>{p.name}</td>
                  <td>{p.category?.name || p.categoryName || '—'}</td>
                  <td>${Number(p.price || 0).toFixed(2)}</td>
                  <td>
                    <span style={{ color: (p.stock ?? 99) <= 5 ? '#dc3545' : '#333', fontWeight: (p.stock ?? 99) <= 5 ? 700 : 400 }}>
                      {p.stock ?? '—'}
                    </span>
                  </td>
                  <td>
                    <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setEditProduct(p)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      {editProduct && (
        <EditModal product={editProduct} onClose={() => setEditProduct(null)} onSaved={fetchProducts} />
      )}
    </div>
  )
}
