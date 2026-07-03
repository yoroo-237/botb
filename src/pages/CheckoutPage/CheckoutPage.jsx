import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext.jsx'
import { useApp } from '../../context/AppContext.jsx'
import { apiFetch } from '../../utils/api.js'
import { formatPrice } from '../../data/products.js'
import styles from './CheckoutPage.module.css'

const PAYMENT_METHODS = [
  { id: 'XMR', label: 'Monero', color: '#ff6600', symbol: 'ɱ' },
  { id: 'BTC', label: 'Bitcoin', color: '#f7931a', symbol: '₿' },
  { id: 'DOGE', label: 'Dogecoin', color: '#c2a633', symbol: 'Ð' },
  { id: 'LTC', label: 'Litecoin', color: '#345d9d', symbol: 'Ł' },
]

const INITIAL_FORM = {
  name: '', email: '', address: '', city: '', postalCode: '', country: 'US',
}

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart()
  const { user, balance, loadingAuth } = useApp()
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_FORM)
  const [paymentMethod, setPaymentMethod] = useState('XMR')
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmation, setConfirmation] = useState(null)

  const shippingFee = 0
  const total = subtotal + shippingFee

  if (loadingAuth) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading…</div>
  if (!user) return <Navigate to="/login" state={{ from: { pathname: '/checkout' } }} replace />

  if (confirmation) {
    return (
      <main className="site-main">
        <div className="alignwide">
          <div className={styles.success}>
            <div className={styles.successIcon}>✓</div>
            <h1 className={styles.successTitle}>Order Placed!</h1>
            <p className={styles.successMsg}>
              Your order <strong>#{confirmation}</strong> has been received. You will be contacted for delivery details.
            </p>
            <button onClick={() => navigate('/')} className="wp-element-button">
              Continue Shopping
            </button>
          </div>
        </div>
      </main>
    )
  }

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(er => ({ ...er, [e.target.name]: '' }))
  }

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Full name is required'
    if (!form.email.trim()) errs.email = 'Email is required'
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) errs.email = 'Invalid email'
    if (!form.address.trim()) errs.address = 'Address is required'
    if (!form.city.trim()) errs.city = 'City is required'
    if (!form.postalCode.trim()) errs.postalCode = 'Postal code is required'
    if (!form.country.trim()) errs.country = 'Country is required'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    if (balance < total) {
      setSubmitError('Insufficient balance. Please add funds to your wallet.')
      return
    }

    setLoading(true)
    setSubmitError('')
    try {
      const shippingAddress = `${form.address}, ${form.city} ${form.postalCode}, ${form.country}`
      const data = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map(item => ({ productId: item.id, quantity: item.quantity })),
          shippingAddress,
          paymentMethod,
          name: form.name,
          email: form.email,
        }),
      })
      clearCart()
      const orderNumber = data.order?.orderNumber || data.order?.id || data.id || 'N/A'
      setConfirmation(orderNumber)
    } catch (err) {
      setSubmitError(err.message || 'Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const balanceInsufficient = balance < total

  return (
    <main className="site-main">
      <div className="alignwide">
        <h1 className={styles.pageTitle}>Checkout</h1>

        {balanceInsufficient && (
          <div className={styles.balanceWarning}>
            Insufficient wallet balance (${balance.toFixed(2)} available, ${total.toFixed(2)} required).{' '}
            <Link to="/wallet" className={styles.walletLink}>Add funds to your wallet</Link>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.checkoutLayout}>
            <div className={styles.billingSection}>
              <h2 className={styles.sectionTitle}>Delivery Information</h2>

              <Field label="Full Name *" name="name" value={form.name} onChange={handleChange} error={errors.name} />
              <Field label="Email *" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} />
              <Field label="Address *" name="address" value={form.address} onChange={handleChange} error={errors.address} />
              <div className={styles.fieldRow}>
                <Field label="City *" name="city" value={form.city} onChange={handleChange} error={errors.city} />
                <Field label="Postal Code *" name="postalCode" value={form.postalCode} onChange={handleChange} error={errors.postalCode} />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="country">Country</label>
                <select id="country" name="country" value={form.country} onChange={handleChange} className={styles.select}>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="NL">Netherlands</option>
                  <option value="CH">Switzerland</option>
                  <option value="AT">Austria</option>
                  <option value="BE">Belgium</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <h2 className={styles.sectionTitle} style={{ marginTop: '28px' }}>Payment Method</h2>
              <div className={styles.paymentMethods}>
                {PAYMENT_METHODS.map(pm => (
                  <label
                    key={pm.id}
                    className={styles.paymentOption + (paymentMethod === pm.id ? ' ' + styles.paymentSelected : '')}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={pm.id}
                      checked={paymentMethod === pm.id}
                      onChange={() => setPaymentMethod(pm.id)}
                      className={styles.radioHidden}
                    />
                    <span className={styles.cryptoBadge} style={{ background: pm.color }}>
                      {pm.symbol}
                    </span>
                    <span className={styles.paymentLabel}>{pm.id}</span>
                  </label>
                ))}
              </div>
            </div>

            <aside className={styles.orderSummary}>
              <h2 className={styles.sectionTitle}>Your Order</h2>

              <div className={styles.orderHeader}>
                <span>Product</span>
                <span>Subtotal</span>
              </div>

              {items.map(item => (
                <div key={item.id} className={styles.orderItem}>
                  <span className={styles.orderItemName}>{item.name} <strong>× {item.quantity}</strong></span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}

              <div className={styles.orderRow}>
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className={styles.orderRow}>
                <span>Shipping</span>
                <span>{shippingFee === 0 ? 'Free' : formatPrice(shippingFee)}</span>
              </div>
              <div className={styles.orderRow + ' ' + styles.orderTotal}>
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>

              <div className={styles.walletBalance}>
                <span>Wallet Balance</span>
                <span style={{ color: balanceInsufficient ? '#dc3545' : '#28a745' }}>
                  ${balance.toFixed(2)}
                </span>
              </div>

              {submitError && (
                <div className={styles.submitError}>{submitError}</div>
              )}

              <button
                type="submit"
                className={'wp-element-button ' + styles.placeOrderBtn}
                disabled={loading || items.length === 0}
              >
                {loading ? 'Placing Order…' : 'Place Order'}
              </button>
            </aside>
          </div>
        </form>
      </div>
    </main>
  )
}

function Field({ label, name, type = 'text', value, onChange, error, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
      {label && (
        <label htmlFor={name} style={{ fontSize: 'var(--font-size-small)', fontWeight: 500 }}>
          {label}
        </label>
      )}
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          appearance: 'none',
          border: '1px solid ' + (error ? '#cf2e2e' : 'var(--color-accent-6)'),
          fontFamily: 'inherit',
          fontSize: 'var(--font-size-medium)',
          padding: '10px 14px',
          width: '100%',
          outline: 'none',
          background: 'var(--color-base)',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--color-contrast)'}
        onBlur={e => e.target.style.borderColor = error ? '#cf2e2e' : 'var(--color-accent-6)'}
      />
      {error && <span style={{ fontSize: 'var(--font-size-small)', color: '#cf2e2e' }}>{error}</span>}
    </div>
  )
}
