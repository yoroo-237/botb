import { useState, useEffect, useCallback } from 'react'
import { adminFetch } from './utils/api.js'
import Pagination from '../../components/admin/Pagination.jsx'

const PLACEHOLDER = 'https://bestofthebay.net/wp-content/uploads/woocommerce-placeholder.webp'

function isVideoUrl(url = '') {
  return /\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/i.test(url)
}

// ─── Media Manager (images + videos) ─────────────────────────────────────────

function MediaManager({ productId, images, onUpdated }) {
  const [url, setUrl]       = useState('')
  const [thumb, setThumb]   = useState('')
  const [type, setType]     = useState('image')
  const [adding, setAdding] = useState(false)
  const [err, setErr]       = useState('')

  async function add() {
    if (!url.trim()) return
    setAdding(true); setErr('')
    try {
      await adminFetch(`/admin/products/${productId}/images`, {
        method: 'POST',
        body: JSON.stringify({ url: url.trim(), thumbnail: thumb.trim() || null, mediaType: type, position: images.length }),
      })
      setUrl(''); setThumb(''); setType('image')
      onUpdated()
    } catch (e) { setErr(e.message) } finally { setAdding(false) }
  }

  async function remove(imgId) {
    if (!confirm('Remove this media?')) return
    try {
      await adminFetch(`/admin/products/${productId}/images/${imgId}`, { method: 'DELETE' })
      onUpdated()
    } catch (e) { alert(e.message) }
  }

  return (
    <div>
      <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: '13px' }}>
        Media items ({images.length})
      </p>

      {images.length === 0 && (
        <p style={{ color: '#888', fontSize: '13px', margin: '0 0 12px' }}>No media yet. Add images or videos below.</p>
      )}

      {images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: '8px', marginBottom: '16px' }}>
          {images.map((img, idx) => {
            const isVid = img.mediaType === 'video' || isVideoUrl(img.url)
            return (
              <div
                key={img.id}
                style={{ position: 'relative', aspectRatio: '1', background: '#e8ecf0', borderRadius: '6px', overflow: 'hidden' }}
              >
                {isVid ? (
                  <>
                    {img.thumbnail
                      ? <img src={img.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="#666"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                    }
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <div style={{ background: 'rgba(0,0,0,0.55)', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="11" height="13" viewBox="0 0 11 13" fill="white"><polygon points="0,0 11,6.5 0,13"/></svg>
                      </div>
                    </div>
                    <div style={{ position: 'absolute', bottom: '2px', left: '3px', fontSize: '9px', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      video
                    </div>
                  </>
                ) : (
                  <img
                    src={img.thumbnail || img.url}
                    alt={`Media ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.currentTarget.src = PLACEHOLDER }}
                  />
                )}

                <div style={{ position: 'absolute', bottom: '2px', right: '2px', fontSize: '10px', background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '1px 4px', borderRadius: '3px' }}>
                  #{idx + 1}
                </div>

                <button
                  onClick={() => remove(img.id)}
                  title="Remove"
                  style={{ position: 'absolute', top: '3px', right: '3px', background: 'rgba(220,53,69,0.9)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', color: '#fff', fontSize: '15px', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                >×</button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add form */}
      <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '14px', border: '1px solid #e8ecf0' }}>
        <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: '13px', color: '#444' }}>Add media</p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            style={{ padding: '7px 8px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px', background: '#fff', cursor: 'pointer' }}
          >
            <option value="image">🖼 Image</option>
            <option value="video">🎬 Video</option>
          </select>
          <input
            className="admin-input"
            style={{ flex: 1, fontSize: '13px', padding: '7px 10px' }}
            placeholder={type === 'video' ? 'Video URL (https://…mp4)' : 'Image URL (https://…)'}
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            className="admin-input"
            style={{ flex: 1, fontSize: '13px', padding: '7px 10px' }}
            placeholder={type === 'video' ? 'Poster/thumbnail URL (optional)' : 'Thumbnail URL (optional, smaller version)'}
            value={thumb}
            onChange={e => setThumb(e.target.value)}
          />
          <button
            className="admin-btn admin-btn-primary admin-btn-sm"
            onClick={add}
            disabled={adding || !url.trim()}
            style={{ whiteSpace: 'nowrap' }}
          >
            {adding ? 'Adding…' : '+ Add'}
          </button>
        </div>

        {err && <p style={{ margin: '8px 0 0', color: '#dc3545', fontSize: '12px' }}>{err}</p>}
      </div>
    </div>
  )
}

// ─── Product Modal (create + edit) ───────────────────────────────────────────

function ProductModal({ product, onClose, onSaved, categories }) {
  const isEdit = Boolean(product?.id)

  const [form, setForm] = useState({
    name:        '',
    slug:        '',
    price:       '',
    stock:       0,
    description: '',
    categoryId:  '',
    isActive:    true,
  })
  const [images, setImages]   = useState([])
  const [tab, setTab]         = useState('info')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [error, setError]     = useState('')

  // Fetch full product (with all images) when editing
  useEffect(() => {
    if (!isEdit) return
    setFetching(true)
    adminFetch(`/admin/products/${product.id}`)
      .then(data => {
        setForm({
          name:        data.name        || '',
          slug:        data.slug        || '',
          price:       data.price       ?? '',
          stock:       data.stock       ?? 0,
          description: data.description || '',
          categoryId:  data.categoryId  || '',
          isActive:    data.isActive    ?? true,
        })
        setImages(data.images || [])
      })
      .catch(() => {
        // fallback to list data
        setForm({
          name:        product.name        || '',
          slug:        product.slug        || '',
          price:       product.price       ?? '',
          stock:       product.stock       ?? 0,
          description: product.description || '',
          categoryId:  product.categoryId  || '',
          isActive:    product.isActive    ?? true,
        })
        setImages(product.images || [])
      })
      .finally(() => setFetching(false))
  }, [isEdit, product?.id])

  async function refreshImages() {
    try {
      const data = await adminFetch(`/admin/products/${product.id}`)
      setImages(data.images || [])
    } catch {}
  }

  function handleNameChange(v) {
    setForm(f => ({
      ...f,
      name: v,
      ...(!isEdit ? { slug: v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') } : {}),
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const body = {
        name:        form.name,
        slug:        form.slug,
        price:       parseFloat(form.price),
        stock:       parseInt(form.stock, 10),
        description: form.description || null,
        categoryId:  form.categoryId  || null,
        isActive:    form.isActive,
      }
      if (isEdit) {
        await adminFetch(`/admin/products/${product.id}`, { method: 'PUT', body: JSON.stringify(body) })
        onSaved()
      } else {
        const created = await adminFetch(`/admin/products`, { method: 'POST', body: JSON.stringify(body) })
        onSaved()
        // Switch to edit mode on the newly created product so user can add media
        // We close create and let the list refresh show the product
        onClose()
      }
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div
      className="admin-modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="admin-modal"
        style={{ maxWidth: '660px', width: '100%', maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: 0, borderRadius: '12px', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px 0' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{isEdit ? 'Edit Product' : 'New Product'}</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#666', lineHeight: 1, padding: '2px 6px' }}
          >×</button>
        </div>

        {/* Tabs (edit only) */}
        {isEdit && (
          <div style={{ display: 'flex', padding: '12px 22px 0', borderBottom: '1px solid #e8ecf0', gap: '2px' }}>
            {[
              { key: 'info',  label: 'Product Info' },
              { key: 'media', label: `Media (${images.length})` },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: tab === t.key ? '2px solid #503AA8' : '2px solid transparent',
                  cursor: 'pointer',
                  fontWeight: tab === t.key ? 700 : 400,
                  color:      tab === t.key ? '#503AA8' : '#666',
                  fontSize: '14px',
                  marginBottom: '-1px',
                  transition: 'color 0.15s',
                }}
              >{t.label}</button>
            ))}
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 22px' }}>
          {fetching ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>Loading…</div>
          ) : tab === 'info' ? (
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ background: '#fff5f5', border: '1px solid #fcc', borderRadius: '6px', padding: '10px 14px', color: '#c00', fontSize: '14px', marginBottom: '14px' }}>
                  {error}
                </div>
              )}

              <div className="admin-form-group">
                <label className="admin-label">Name *</label>
                <input
                  className="admin-input"
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  required
                  placeholder="Product name"
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Slug *</label>
                <input
                  className="admin-input"
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  required
                  placeholder="product-url-slug"
                  style={{ fontFamily: 'monospace', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="admin-form-group">
                  <label className="admin-label">Price ($) *</label>
                  <input
                    className="admin-input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    required
                    placeholder="0.00"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Stock</label>
                  <input
                    className="admin-input"
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Category</label>
                <select
                  className="admin-input"
                  value={form.categoryId}
                  onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                >
                  <option value="">— No category —</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Description</label>
                <textarea
                  className="admin-input"
                  rows={4}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Product description…"
                  style={{ resize: 'vertical', minHeight: '80px' }}
                />
              </div>

              {isEdit && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <label className="admin-label" style={{ margin: 0 }}>Active (visible in shop)</label>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>
              )}

              <div className="admin-modal-actions" style={{ marginTop: '8px' }}>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
                  {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
                </button>
              </div>
            </form>
          ) : (
            <MediaManager productId={product.id} images={images} onUpdated={refreshImages} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminProducts() {
  const [products, setProducts]     = useState([])
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [editProduct, setEditProduct] = useState(null)
  const [showCreate, setShowCreate]   = useState(false)
  const [categories, setCategories]   = useState([])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 20 })
      if (search) params.set('search', search)
      const data = await adminFetch(`/admin/products?${params}`)
      setProducts(data.products || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  useEffect(() => {
    adminFetch('/admin/categories').then(d => setCategories(d || [])).catch(() => {})
  }, [])

  function handleSearch(v) {
    setSearch(v)
    setPage(1)
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Products</h1>
          <p className="admin-page-subtitle">Manage product catalog — images and videos</p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowCreate(true)}>
          + New Product
        </button>
      </div>

      <div className="admin-card" style={{ marginBottom: '12px', padding: '12px 16px' }}>
        <input
          className="admin-input"
          placeholder="Search by name…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          style={{ maxWidth: '360px', margin: 0 }}
        />
      </div>

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '56px' }}>Media</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><span className="admin-skel" style={{ width: j === 0 ? '48px' : '80px', height: j === 0 ? '48px' : '16px', borderRadius: j === 0 ? '4px' : '3px' }} /></td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr><td colSpan={7} className="admin-table-empty">No products found.</td></tr>
              ) : products.map(p => {
                const firstMedia   = p.images?.[0]
                const mediaCount   = p._count?.images ?? p.images?.length ?? 0
                const isVid        = firstMedia?.mediaType === 'video' || isVideoUrl(firstMedia?.url || '')

                return (
                  <tr key={p.id}>
                    {/* Thumbnail */}
                    <td>
                      {firstMedia ? (
                        <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '4px', overflow: 'hidden', background: isVid ? '#111' : '#e8ecf0', flexShrink: 0 }}>
                          <img
                            src={firstMedia.thumbnail || (isVid ? '' : firstMedia.url)}
                            alt={p.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => { e.currentTarget.src = PLACEHOLDER }}
                          />
                          {isVid && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="14" height="16" viewBox="0 0 14 16" fill="white"><polygon points="0,0 14,8 0,16"/></svg>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ width: '48px', height: '48px', background: '#e8ecf0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '1.4rem' }}>?</div>
                      )}
                    </td>

                    {/* Name + media count badge */}
                    <td>
                      <span style={{ fontWeight: 500 }}>{p.name}</span>
                      {mediaCount > 0 && (
                        <span style={{ marginLeft: '6px', fontSize: '11px', background: '#ede9fa', color: '#503AA8', borderRadius: '10px', padding: '1px 7px', fontWeight: 600 }}>
                          {mediaCount} {mediaCount === 1 ? 'media' : 'media'}
                        </span>
                      )}
                    </td>

                    <td style={{ color: '#555' }}>{p.category?.name || '—'}</td>

                    <td style={{ fontWeight: 600 }}>${Number(p.price || 0).toFixed(2)}</td>

                    <td>
                      <span style={{ color: (p.stock ?? 99) <= 5 ? '#dc3545' : '#333', fontWeight: (p.stock ?? 99) <= 5 ? 700 : 400 }}>
                        {p.stock ?? '—'}
                      </span>
                    </td>

                    <td>
                      <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: p.isActive ? '#d4edda' : '#f8d7da', color: p.isActive ? '#155724' : '#721c24' }}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td>
                      <button
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                        onClick={() => setEditProduct(p)}
                      >
                        Edit
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

      {editProduct && (
        <ProductModal
          key={editProduct.id}
          product={editProduct}
          categories={categories}
          onClose={() => setEditProduct(null)}
          onSaved={fetchProducts}
        />
      )}

      {showCreate && (
        <ProductModal
          key="create"
          product={null}
          categories={categories}
          onClose={() => setShowCreate(false)}
          onSaved={() => { fetchProducts(); setShowCreate(false) }}
        />
      )}
    </div>
  )
}
