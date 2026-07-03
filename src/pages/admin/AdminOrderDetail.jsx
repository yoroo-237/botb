import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminFetch } from './utils/api.js'
import StatusBadge from '../../components/admin/StatusBadge.jsx'

export default function AdminOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    adminFetch(`/admin/orders/${id}`)
      .then(d => setOrder(d.order || d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  function formatDate(str) {
    if (!str) return '—'
    return new Date(str).toLocaleString()
  }

  if (loading) return <div style={{ padding: '40px', color: '#888' }}>Loading…</div>
  if (error) return <div style={{ color: '#dc3545', padding: '20px' }}>{error}</div>
  if (!order) return null

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => navigate('/mario-dashboard/orders')} style={{ marginBottom: '8px' }}>
            ← Back to Orders
          </button>
          <h1 className="admin-page-title">Order #{order.orderNumber || order.id?.slice(0, 8)}</h1>
          <p className="admin-page-subtitle">{formatDate(order.createdAt)}</p>
        </div>
        <StatusBadge type="status" value={order.status} />
      </div>

      <div className="admin-grid-2">
        <div className="admin-card">
          <h2 className="admin-card-title">Order Info</h2>
          <div className="admin-info-list">
            <div className="admin-info-row"><span className="admin-info-label">Customer</span><span className="admin-info-value">{order.user?.username || order.name || '—'}</span></div>
            <div className="admin-info-row"><span className="admin-info-label">Email</span><span className="admin-info-value">{order.email || '—'}</span></div>
            <div className="admin-info-row"><span className="admin-info-label">Payment</span><span className="admin-info-value">{order.paymentMethod || '—'}</span></div>
            <div className="admin-info-row"><span className="admin-info-label">Total</span><span className="admin-info-value">${Number(order.total || 0).toFixed(2)}</span></div>
            <div className="admin-info-row"><span className="admin-info-label">Shipping</span><span className="admin-info-value">{order.shippingAddress || '—'}</span></div>
          </div>
        </div>

        <div className="admin-card">
          <h2 className="admin-card-title">Items</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Product</th><th>Qty</th><th>Price</th></tr>
              </thead>
              <tbody>
                {(order.items || []).length === 0 ? (
                  <tr><td colSpan={3} className="admin-table-empty">No items.</td></tr>
                ) : (order.items || []).map((item, i) => (
                  <tr key={i}>
                    <td>{item.product?.name || item.productId || '—'}</td>
                    <td>{item.quantity}</td>
                    <td>${Number(item.price || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
