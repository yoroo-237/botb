import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext.jsx'
import { getThumb, formatPrice } from '../../data/products.js'
import styles from './CheckoutPage.module.css'

const INITIAL = {
  firstName: '', lastName: '', company: '', country: 'US',
  address1: '', address2: '', city: '', state: '', postcode: '',
  phone: '', email: '',
}

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart()
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState({})

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function validate() {
    const errs = {}
    if (!form.firstName.trim()) errs.firstName = 'Required'
    if (!form.lastName.trim())  errs.lastName = 'Required'
    if (!form.address1.trim())  errs.address1 = 'Required'
    if (!form.city.trim())      errs.city = 'Required'
    if (!form.postcode.trim())  errs.postcode = 'Required'
    if (!form.phone.trim())     errs.phone = 'Required'
    if (!form.email.trim())     errs.email = 'Required'
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) errs.email = 'Invalid email'
    return errs
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitted(true)
    clearCart()
  }

  if (submitted) {
    return (
      <main className="site-main">
        <div className="alignwide">
          <div className={styles.success}>
            <h1 className={styles.successTitle}>Order received!</h1>
            <p className={styles.successMsg}>
              Thank you for your order. You will be contacted via Telegram to arrange delivery.
            </p>
            <button onClick={() => navigate('/')} className={'wp-element-button'}>
              Continue shopping
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="site-main">
      <div className="alignwide">
        <h1 className={styles.pageTitle}>Checkout</h1>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.checkoutLayout}>
            {/* Billing form */}
            <div className={styles.billingSection}>
              <h2 className={styles.sectionTitle}>Billing details</h2>

              <div className={styles.fieldRow}>
                <Field label="First name *" name="firstName" value={form.firstName} onChange={handleChange} error={errors.firstName} />
                <Field label="Last name *"  name="lastName"  value={form.lastName}  onChange={handleChange} error={errors.lastName} />
              </div>
              <Field label="Company name (optional)" name="company"  value={form.company}  onChange={handleChange} />
              <Field label="Street address *"         name="address1" value={form.address1} onChange={handleChange} error={errors.address1} placeholder="House number and street name" />
              <Field label=""                          name="address2" value={form.address2} onChange={handleChange} placeholder="Apartment, suite, unit, etc. (optional)" />
              <Field label="Town / City *"             name="city"     value={form.city}     onChange={handleChange} error={errors.city} />

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="state">State</label>
                  <select id="state" name="state" value={form.state} onChange={handleChange} className={styles.select}>
                    <option value="">Select state…</option>
                    <option value="CA">California</option>
                    <option value="NY">New York</option>
                    <option value="TX">Texas</option>
                    <option value="FL">Florida</option>
                    <option value="WA">Washington</option>
                    <option value="OR">Oregon</option>
                    <option value="NV">Nevada</option>
                    <option value="AZ">Arizona</option>
                    <option value="CO">Colorado</option>
                    <option value="IL">Illinois</option>
                    <option value="GA">Georgia</option>
                    <option value="MA">Massachusetts</option>
                  </select>
                </div>
                <Field label="ZIP Code *" name="postcode" value={form.postcode} onChange={handleChange} error={errors.postcode} />
              </div>

              <Field label="Phone *" name="phone" type="tel"   value={form.phone} onChange={handleChange} error={errors.phone} />
              <Field label="Email address *" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} />

              <div className={styles.privacyNote}>
                <p>Your personal data will be used to process your order. Contact us via{' '}
                  <a href="https://t.me/BESTOFTHEBAYOG" target="_blank" rel="noreferrer">Telegram</a>{' '}
                  for any questions.
                </p>
              </div>
            </div>

            {/* Order summary */}
            <aside className={styles.orderSummary}>
              <h2 className={styles.sectionTitle}>Your order</h2>

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
                <span>Free shipping</span>
              </div>
              <div className={styles.orderRow + ' ' + styles.orderTotal}>
                <span>Total</span>
                <span>{formatPrice(subtotal)}</span>
              </div>

              <div className={styles.paymentSection}>
                <h3 className={styles.paymentTitle}>Payment</h3>
                <p className={styles.paymentNote}>
                  Payment via Telegram. After placing your order, you will be contacted via Telegram to complete your purchase.
                </p>
              </div>

              <button type="submit" className={'wp-element-button ' + styles.placeOrderBtn}>
                Place order
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
