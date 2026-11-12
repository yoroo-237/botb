import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { apiFetch } from '../../utils/api.js'
import { useApp } from '../../context/AppContext.jsx'
import styles from './OrdersPage.module.css'

const URI = { BTC: 'bitcoin', LTC: 'litecoin', DOGE: 'dogecoin', ETH: 'ethereum', XMR: 'monero' }
const AUTO = ['BTC', 'LTC', 'DOGE']
const fmt = n => (n == null ? '' : Number(n).toFixed(8).replace(/\.?0+$/, ''))
const money = n => `$${Number(n || 0).toFixed(2)}`
const wrap = { paddingLeft: 'var(--root-padding)', paddingRight: 'var(--root-padding)' }

function countdown(expiresAt) {
  const ms = new Date(expiresAt) - Date.now()
  if (ms <= 0) return '0:00'
  return `${Math.floor(ms / 6e4)}:${String(Math.floor(ms % 6e4 / 1e3)).padStart(2, '0')}`
}

// An order paid straight in crypto: its own address, the exact amount, the time left.
// Payments add up; the page reads the blockchain every 30 s and moves on once it is paid.
export default function OrderPayPage() {
  const { id } = useParams()
  const { refreshBalance } = useApp()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [left, setLeft] = useState('')
  const [copied, setCopied] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(() => apiFetch(`/orders/${id}/payment`).then(setData).catch(e => setError(e.message)), [id])
  useEffect(() => { load() }, [load])

  const status = data?.order?.status
  const currency = data?.currency
  const awaiting = status === 'awaiting_payment'

  const check = useCallback(async () => {
    setChecking(true)
    try { setData(await apiFetch(`/orders/${id}/payment/check`, { method: 'POST' })) }
    catch { /* checked again next time */ }
    finally { setChecking(false) }
  }, [id])

  useEffect(() => {
    if (!awaiting) return
    const t = setInterval(() => { if (document.visibilityState === 'visible') check() }, 30000)
    return () => clearInterval(t)
  }, [awaiting, check])

  useEffect(() => {
    if (!awaiting || !data?.order?.expiresAt) return
    const tick = () => { setLeft(countdown(data.order.expiresAt)); if (new Date(data.order.expiresAt) <= Date.now()) load() }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [awaiting, data?.order?.expiresAt, load])

  useEffect(() => { if (status === 'processing') refreshBalance?.() }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  const copy = (text, what) => { navigator.clipboard?.writeText(String(text)); setCopied(what); setTimeout(() => setCopied(''), 1800) }

  async function cancel() {
    if (!window.confirm('Cancel this order? Anything already received is refunded.')) return
    setCancelling(true)
    try { await apiFetch(`/orders/${id}/cancel`, { method: 'POST' }); await load() }
    catch (e) { setError(e.message) }
    finally { setCancelling(false) }
  }

  const page = children => (
    <main className="site-main" style={{ padding: 0 }}>
      <div className={`alignwide ${styles.page}`} style={wrap}>{children}</div>
    </main>
  )

  if (error && !data) return page(<div className={styles.card}><h1 className={styles.title}>Order not found</h1><p className={styles.muted}>{error}</p><Link to="/orders" className={styles.btn}>My orders</Link></div>)
  if (!data) return page(<p className={styles.muted}>Loading…</p>)

  const { order, deposit } = data
  const received = deposit ? Number(deposit.amountReceived) : 0
  const toSend = received > 0 ? data.remaining : data.amountDue
  const qr = deposit?.address ? `${URI[currency] || currency.toLowerCase()}:${deposit.address}${AUTO.includes(currency) && toSend ? `?amount=${fmt(toSend)}` : ''}` : ''

  if (['processing', 'shipped', 'delivered'].includes(status)) {
    return page(
      <div className={styles.card}>
        <h1 className={styles.title}>Payment received</h1>
        <p>Order <b>{order.orderNumber}</b> is paid and being prepared. The shop will contact you on Telegram to finish up.</p>
        <div className={styles.actions}><Link to="/orders" className={styles.btn}>My orders</Link><Link to="/shop" className={styles.btnOutline}>Keep shopping</Link></div>
      </div>
    )
  }
  if (!awaiting) {
    return page(
      <div className={styles.card}>
        <h1 className={styles.title}>Order {order.orderNumber} was cancelled</h1>
        <p className={styles.muted}>{received > 0 ? `${fmt(received)} ${currency} received for it is being refunded.` : 'No payment was received for it.'} A payment sent to its address now is refunded too.</p>
        <Link to="/orders" className={styles.btn}>My orders</Link>
      </div>
    )
  }

  return page(
    <>
      <h1 className={styles.title}>Pay order {order.orderNumber}</h1>
      <div className={styles.payGrid}>
        <div className={styles.card}>
          <div className={styles.row}>
            <b>{currency}</b>
            <span className={styles.muted} aria-live="polite">Time left <span className={styles.timer}>{left}</span></span>
          </div>
          {qr && <div className={styles.qr}><QRCodeSVG value={qr} size={196} includeMargin /></div>}
          <div className={styles.field}>
            <span className={styles.label}>{received > 0 ? 'Still to send' : 'Amount to send'}</span>
            <div className={styles.copyRow}>
              <code className={`${styles.code} ${styles.amount}`}>{fmt(toSend)} {currency}</code>
              <button type="button" className={styles.btnOutline} onClick={() => copy(fmt(toSend), 'amount')}>{copied === 'amount' ? 'Copied' : 'Copy'}</button>
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>To this address</span>
            <div className={styles.copyRow}>
              <code className={styles.code}>{deposit?.address}</code>
              <button type="button" className={styles.btnOutline} onClick={() => copy(deposit?.address, 'address')}>{copied === 'address' ? 'Copied' : 'Copy'}</button>
            </div>
          </div>
          {received > 0 && <div className={styles.warn}>Received so far: {fmt(received)} {currency}. Send the rest to the same address.</div>}
          {error && <div className={styles.err}>{error}</div>}
          <p className={styles.note}>Send exactly this amount, in {currency} only. It is priced for this order and includes the {data.commissionPct}% deposit fee. Several payments add up. Anything sent after the time runs out, or above the amount, is refunded.</p>
          <p className={styles.note}>
            {AUTO.includes(currency) ? 'Confirmed after 1 blockchain confirmation. This page checks every 30 seconds.'
              : currency === 'ETH' ? 'ETH payments are detected within a few minutes.'
              : <>Monero payments are checked by hand: after sending, <Link to="/support">open a ticket</Link> with the transaction ID.</>}
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.btn} onClick={check} disabled={checking}>{checking ? 'Checking…' : 'I sent it, check now'}</button>
            <button type="button" className={styles.btnOutline} onClick={cancel} disabled={cancelling}>{cancelling ? 'Cancelling…' : 'Cancel order'}</button>
          </div>
        </div>
        <div className={styles.card}>
          <b>Order summary</b>
          {order.items.map(i => <div key={i.id} className={styles.sumRow}><span>{i.quantity} × {i.name}</span><span>{money(i.price * i.quantity)}</span></div>)}
          <div className={styles.sumRow}><span>Delivery</span><span>{order.shippingAddress ? (order.shippingFee ? money(order.shippingFee) : 'Free') : 'None'}</span></div>
          <div className={styles.sumTotal}><span>Total</span><span>{money(order.totalAmount)}</span></div>
        </div>
      </div>
    </>
  )
}
