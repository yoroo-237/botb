import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../../utils/api.js'
import styles from './OrdersPage.module.css'

const STATUS = { awaiting_payment: 'Awaiting payment', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded' }
const money = n => `$${Number(n || 0).toFixed(2)}`
const wrap = { paddingLeft: 'var(--root-padding)', paddingRight: 'var(--root-padding)' }

// The customer's orders, with tracking, and the payment of an order still waiting for it
export default function OrdersPage() {
  const [orders, setOrders] = useState(null)
  useEffect(() => { apiFetch('/orders?limit=50').then(d => setOrders(d.orders || [])).catch(() => setOrders([])) }, [])

  return (
    <main className="site-main" style={{ padding: 0 }}>
      <div className={`alignwide ${styles.page}`} style={wrap}>
        <h1 className={styles.title}>My orders</h1>
        {orders === null ? <p className={styles.muted}>Loading…</p> : orders.length === 0 ? (
          <div className={styles.card}>
            <p>No orders yet. Once you check out, your orders and tracking numbers show up here.</p>
            <Link to="/shop" className={styles.btn}>Start shopping</Link>
          </div>
        ) : orders.map(o => (
          <div key={o.id} className={styles.card}>
            <div className={styles.row}>
              <div>
                <b>{o.orderNumber}</b>
                <div className={styles.muted}>{new Date(o.placedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
              </div>
              <div className={styles.row}>
                <b>{money(o.totalAmount)}</b>
                <span className={`${styles.status} ${styles[o.status] || ''}`}>{STATUS[o.status] || o.status}</span>
                {o.status === 'awaiting_payment' && <Link to={`/orders/${o.id}/pay`} className={styles.btn}>Pay now</Link>}
              </div>
            </div>
            <div className={styles.items}>{(o.items || []).map(i => `${i.quantity} × ${i.name}`).join(', ')}</div>
            {o.trackingNumber && <div className={styles.muted}>Tracking: {o.carrier ? `${o.carrier} · ` : ''}{o.trackingNumber}</div>}
          </div>
        ))}
      </div>
    </main>
  )
}
