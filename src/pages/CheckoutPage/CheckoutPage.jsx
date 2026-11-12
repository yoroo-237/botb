import { useState, useEffect } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useCart, lineKey } from '../../context/CartContext.jsx'
import { useApp } from '../../context/AppContext.jsx'
import { apiFetch } from '../../utils/api.js'
import { formatPrice } from '../../data/products.js'
import { fingerprint, encryptTo } from '../../utils/pgp.js'
import styles from './CheckoutPage.module.css'

const COIN_STYLE = {
  XMR:  { color: '#ff6600', symbol: 'ɱ' },
  BTC:  { color: '#f7931a', symbol: '₿' },
  DOGE: { color: '#c2a633', symbol: 'Ð' },
  LTC:  { color: '#345d9d', symbol: 'Ł' },
  ETH:  { color: '#627eea', symbol: 'Ξ' },
}

const STATES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'],
  ['DE', 'Delaware'], ['DC', 'District of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'],
  ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'],
  ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'],
  ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'],
  ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'],
  ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
]
const EMPTY_ADDRESS = { name: '', street: '', apt: '', city: '', state: '', zip: '' }

// Kept on this device only, to prefill the next delivery
function loadAddress() {
  try { return { ...EMPTY_ADDRESS, ...JSON.parse(localStorage.getItem('checkout_address') || '{}') } } catch { return EMPTY_ADDRESS }
}

export default function CheckoutPage() {
  const { items, subtotal, clearCart, syncCart } = useCart()
  const { user, balance, holdings, loadingAuth, loadUserData } = useApp()
  const navigate = useNavigate()
  // Nothing is required: the Telegram username/ID is optional (asked only when the
  // profile has none, then saved to it), and delivery is an option: choosing it
  // asks for a US address, adds shipping and puts the address on the invoice.
  const [profileHandle, setProfileHandle] = useState(null)
  const [telegram, setTelegram] = useState('')
  const [delivery, setDelivery] = useState(false)
  const [address, setAddress] = useState(loadAddress)
  const [touched, setTouched] = useState(false)
  // '' = automatic (largest holdings first), otherwise pay from that currency only
  const [payCurrency, setPayCurrency] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [shipping, setShipping] = useState({ cost: 0, freeThreshold: 0 })
  // Paid from the wallet balance, or straight in crypto to the order's own address
  const [method, setMethod] = useState('wallet')
  const [coins, setCoins] = useState(null)
  const [coin, setCoin] = useState('')
  const [payWindow, setPayWindow] = useState(30)
  // Optional: where the shop sends money back should the order be refunded
  const [refund, setRefund] = useState({ currency: 'BTC', address: '' })
  // The shop's PGP key: the address can then be encrypted on this device before it is sent
  const [shopKey, setShopKey] = useState('')
  const [encrypt, setEncrypt] = useState(true)
  const [keyPrint, setKeyPrint] = useState(null)
  useEffect(() => { if (shopKey && delivery) fingerprint(shopKey).then(setKeyPrint) }, [shopKey, delivery])
  const encrypting = !!(shopKey && encrypt && keyPrint)
  useEffect(() => {
    apiFetch('/orders/payable-coins').then(d => { setCoins(d.coins || []); setPayWindow(d.payWindowMinutes || 30); setCoin(c => c || d.coins?.[0] || '') }).catch(() => setCoins([]))
  }, [])
  // Paid in crypto: a refund goes back in the coin paid, so the refund address is that coin's
  useEffect(() => { if (method === 'crypto' && coin) setRefund(r => (r.currency === coin ? r : { currency: coin, address: '' })) }, [method, coin])

  // Same rule as the backend (order.service): free above the threshold, else the flat cost
  useEffect(() => {
    apiFetch('/content/settings')
      .then(d => {
        setShipping({
          cost:          parseFloat(d.settings?.shipping_cost) || 0,
          freeThreshold: parseFloat(d.settings?.shipping_free_threshold) || 0,
        })
        setShopKey(d.settings?.pgp_public_key?.trim() || '')
      })
      .catch(() => {})
  }, [])

  // Live prices before paying: the total shown is the total charged
  useEffect(() => { syncCart() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) apiFetch('/profile').then(p => {
      setProfileHandle(p.telegramHandle || '')
      // The refund address given last time (kept on the account for BTC and XMR)
      if (p.btcRefundAddress) setRefund(r => r.address ? r : { currency: 'BTC', address: p.btcRefundAddress })
      else if (p.xmrRefundAddress) setRefund(r => r.address ? r : { currency: 'XMR', address: p.xmrRefundAddress })
    }).catch(() => setProfileHandle(''))
  }, [user])

  const deliveryFee = shipping.freeThreshold > 0 && subtotal >= shipping.freeThreshold ? 0 : shipping.cost
  const shippingFee = delivery ? deliveryFee : 0
  const total = subtotal + shippingFee

  const addrErrors = {
    name: !address.name.trim(), street: !address.street.trim(), city: !address.city.trim(),
    state: !address.state, zip: !/^\d{5}(-\d{4})?$/.test(address.zip.trim()),
  }
  const addressOk = !delivery || !Object.values(addrErrors).some(Boolean)
  const setA = k => e => setAddress(a => ({ ...a, [k]: k === 'zip' ? e.target.value.replace(/[^\d-]/g, '') : e.target.value }))
  const bad = k => touched && addrErrors[k]

  if (loadingAuth) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading…</div>
  if (!user) return <Navigate to="/login" state={{ from: { pathname: '/checkout' } }} replace />

  if (confirmation) return <OrderPlaced {...confirmation} onContinue={() => navigate('/')} />

  async function handleSubmit(e) {
    e.preventDefault()
    setTouched(true)
    if (!addressOk) {
      document.getElementById('delivery')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (method === 'wallet' && available < total) {
      setSubmitError(`Insufficient ${payCurrency ? payCurrency + ' ' : ''}balance. Please add funds to your wallet, or pay with crypto.`)
      return
    }
    if (method === 'crypto' && !coin) return

    setLoading(true)
    setSubmitError('')
    try {
      // An encrypted address is not kept on the device either
      if (delivery && !encrypting) { try { localStorage.setItem('checkout_address', JSON.stringify(address)) } catch { /* storage blocked */ } }
      let shipTo = delivery ? { ...address, zip: address.zip.trim() } : null
      if (shipTo && encrypting) {
        const { name, street, apt, city, state, zip } = shipTo
        shipTo = { pgp: await encryptTo(shopKey, [name, street, apt, `${city}, ${state} ${zip}`, 'United States'].filter(Boolean).join('\n')) }
      }
      const lines = items.map(item => ({ productId: item.id, quantity: item.quantity, ...(item.optionId ? { optionId: item.optionId } : {}) }))
      const common = {
        items: lines,
        ...(!profileHandle && telegram.trim() ? { telegram: telegram.trim() } : {}),
        ...(shipTo ? { delivery: shipTo } : {}),
        ...(refund.address.trim() ? { refund: { currency: method === 'crypto' ? coin : refund.currency, address: refund.address.trim() } } : {}),
      }
      if (method === 'crypto') {
        const data = await apiFetch('/orders/pay', { method: 'POST', body: JSON.stringify({ ...common, coin }) })
        clearCart()
        navigate(`/orders/${data.order.id}/pay`)
        return
      }
      const data = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...common,
          paymentMethod: payCurrency || 'wallet',
          ...(payCurrency ? { payCurrency } : {}),
        }),
      })
      clearCart()
      loadUserData()  // the order was paid from the wallet — refresh the header balance
      const orderNumber = data.order?.orderNumber || data.order?.id || data.id || 'N/A'
      setConfirmation({ orderNumber, invoice: data.invoice })
      window.scrollTo({ top: 0 })
    } catch (err) {
      setSubmitError(err.message || 'Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const payHolding = holdings.find(h => h.currency === payCurrency)
  const available = payHolding ? (payHolding.usd || 0) : balance
  const balanceInsufficient = method === 'wallet' && available < total

  if (items.length === 0) {
    return (
      <main className="site-main">
        <div className="alignwide">
          <h1 className={styles.pageTitle}>Checkout</h1>
          <p>Your cart is empty.</p>
          <Link to="/shop" className="wp-element-button">Return to shop</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="site-main">
      <div className="alignwide">
        <h1 className={styles.pageTitle}>Checkout</h1>

        {balanceInsufficient && (
          <div className={styles.balanceWarning}>
            Insufficient {payHolding ? payCurrency : 'wallet'} balance (${available.toFixed(2)} available, ${total.toFixed(2)} required).{' '}
            <Link to="/wallet" className={styles.walletLink}>Add funds to your wallet</Link>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.checkoutLayout}>
            <div className={styles.billingSection}>
              {profileHandle === '' && (
                <>
                  <h2 className={styles.sectionTitle}>Telegram <span style={{ fontWeight: 400, opacity: .6, fontSize: '0.8em' }}>(optional)</span></h2>
                  <Field label="Your Telegram username or ID" name="telegram" placeholder="@username" autoComplete="off" value={telegram} onChange={e => setTelegram(e.target.value)} />
                  <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-accent-4)', margin: '4px 0 28px' }}>
                    Added to your invoice so the shop can reach you, and saved to your profile. We don’t ask for anything else.
                  </p>
                </>
              )}

              <div id="delivery" style={{ scrollMarginTop: 100 }}>
                <h2 className={styles.sectionTitle}>Delivery</h2>
                <div className={styles.paymentMethods} role="radiogroup" aria-label="Delivery">
                  <label className={styles.paymentOption + ' ' + styles.deliveryOption + (delivery ? ' ' + styles.paymentSelected : '')}>
                    <input type="radio" name="delivery" checked={delivery} onChange={() => setDelivery(true)} className={styles.radioHidden} />
                    <span className={styles.paymentLabel}>
                      Ship it to me
                      <small className={styles.optionHint}>Discreet, tracked shipping anywhere in the US</small>
                    </span>
                    <span className={styles.optionAmount}>{deliveryFee ? formatPrice(deliveryFee) : 'Free'}</span>
                  </label>
                  <label className={styles.paymentOption + ' ' + styles.deliveryOption + (!delivery ? ' ' + styles.paymentSelected : '')}>
                    <input type="radio" name="delivery" checked={!delivery} onChange={() => setDelivery(false)} className={styles.radioHidden} />
                    <span className={styles.paymentLabel}>
                      No delivery
                      <small className={styles.optionHint}>We’ll sort it out with you on Telegram</small>
                    </span>
                    <span className={styles.optionAmount}>{formatPrice(0)}</span>
                  </label>
                </div>

                {delivery && (
                  <div className={styles.addressForm}>
                    <Field label="Code name" name="a-name" autoComplete="off" placeholder="The name to put on the package" value={address.name} onChange={setA('name')} error={bad('name') && 'Enter a code name for the package'} />
                    <Field label="Street address" name="a-street" autoComplete="shipping address-line1" placeholder="123 Main St" value={address.street} onChange={setA('street')} error={bad('street') && 'Enter a street address'} />
                    <Field label="Apt, suite, unit (optional)" name="a-apt" autoComplete="shipping address-line2" value={address.apt} onChange={setA('apt')} />
                    <div className={styles.fieldRow}>
                      <Field label="City" name="a-city" autoComplete="shipping address-level2" value={address.city} onChange={setA('city')} error={bad('city') && 'Required'} />
                      <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="a-state">State</label>
                        <select id="a-state" className={styles.select} style={bad('state') ? { borderColor: '#cf2e2e' } : undefined} autoComplete="shipping address-level1" value={address.state} onChange={setA('state')}>
                          <option value="">Select</option>
                          {STATES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                        </select>
                        {bad('state') && <span style={{ fontSize: 'var(--font-size-small)', color: '#cf2e2e' }}>Required</span>}
                      </div>
                      <Field label="ZIP code" name="a-zip" inputMode="numeric" autoComplete="shipping postal-code" placeholder="12345" maxLength={10} value={address.zip} onChange={setA('zip')} error={bad('zip') && '5-digit ZIP'} />
                    </div>
                    {shopKey && keyPrint && (
                      <label className={styles.optionHint} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer', margin: '10px 0' }}>
                        <input type="checkbox" checked={encrypt} onChange={e => setEncrypt(e.target.checked)} style={{ marginTop: 3 }} />
                        <span><b>Encrypt my address with PGP.</b> Encrypted on this device with the shop’s key before it’s sent, so only the shop can read it. Key {keyPrint.split(' ').slice(-4).join(' ')}.</span>
                      </label>
                    )}
                    <p className={styles.optionHint}>Shipped in discreet, unmarked packaging. {encrypting ? 'Your address is encrypted: the shop receives it as a PGP message.' : 'Your address goes on the invoice the shop receives on Telegram.'}</p>
                  </div>
                )}
              </div>

              <h2 className={styles.sectionTitle} style={{ marginTop: 'var(--spacing-30)' }}>Payment</h2>
              <div className={styles.paymentMethods} role="radiogroup" aria-label="Payment method" style={{ marginBottom: 12 }}>
                <label className={styles.paymentOption + ' ' + styles.deliveryOption + (method === 'wallet' ? ' ' + styles.paymentSelected : '')}>
                  <input type="radio" name="method" checked={method === 'wallet'} onChange={() => setMethod('wallet')} className={styles.radioHidden} />
                  <span className={styles.paymentLabel}>Wallet balance<small className={styles.optionHint}>Paid instantly from your credits</small></span>
                  <span className={styles.optionAmount}>${balance.toFixed(2)}</span>
                </label>
                <label className={styles.paymentOption + ' ' + styles.deliveryOption + (method === 'crypto' ? ' ' + styles.paymentSelected : '')} style={coins && !coins.length ? { opacity: .55 } : undefined}>
                  <input type="radio" name="method" checked={method === 'crypto'} disabled={coins && !coins.length} onChange={() => setMethod('crypto')} className={styles.radioHidden} />
                  <span className={styles.paymentLabel}>Pay with crypto<small className={styles.optionHint}>{coins && !coins.length ? 'Unavailable right now' : `Send it from any wallet, ${payWindow} minutes to pay`}</small></span>
                </label>
              </div>
              {method === 'crypto' ? (
                <>
                  <div className={styles.paymentMethods}>
                    {(coins || []).map(c => {
                      const style = COIN_STYLE[c] || { color: '#555', symbol: c[0] }
                      return (
                        <label key={c} className={styles.paymentOption + (coin === c ? ' ' + styles.paymentSelected : '')}>
                          <input type="radio" name="coin" checked={coin === c} onChange={() => setCoin(c)} className={styles.radioHidden} />
                          <span className={styles.cryptoBadge} style={{ background: style.color }}>{style.symbol}</span>
                          <span className={styles.paymentLabel}>{c}</span>
                        </label>
                      )
                    })}
                  </div>
                  <p style={{ fontSize: '0.8rem', opacity: .7, marginTop: 8 }}>
                    Next you get this order’s own {coin || 'crypto'} address and the exact amount to send, priced now. Pay within {payWindow} minutes, or the order is cancelled and anything received is refunded.{coin === 'XMR' ? ' Monero payments are checked by hand.' : ''}
                  </p>
                </>
              ) : (<>
              <div className={styles.paymentMethods}>
                {[{ currency: '', label: 'Auto' }, ...holdings].map(h => {
                  const style = COIN_STYLE[h.currency] || { color: '#555', symbol: '$' }
                  return (
                    <label
                      key={h.currency || 'auto'}
                      className={styles.paymentOption + (payCurrency === h.currency ? ' ' + styles.paymentSelected : '')}
                      title={h.currency ? `${h.amount} ${h.currency}` : 'Uses your largest balance first'}
                    >
                      <input
                        type="radio"
                        name="payCurrency"
                        value={h.currency}
                        checked={payCurrency === h.currency}
                        onChange={() => setPayCurrency(h.currency)}
                        className={styles.radioHidden}
                      />
                      <span className={styles.cryptoBadge} style={{ background: style.color }}>{style.symbol}</span>
                      <span className={styles.paymentLabel}>
                        {h.currency || h.label}
                        {h.usd != null && <small style={{ display: 'block', opacity: .7 }}>${h.usd.toFixed(2)}</small>}
                      </span>
                    </label>
                  )
                })}
              </div>
              <p style={{ fontSize: '0.8rem', opacity: .7, marginTop: 8 }}>
                {payHolding?.price
                  ? `≈ ${+(total / payHolding.price).toFixed(8)} ${payCurrency} at the current price. `
                  : ''}
                The total is converted at the live price when you place the order, and that amount of crypto is locked in.
              </p>
              </>)}

              <h2 className={styles.sectionTitle} style={{ marginTop: 'var(--spacing-30)' }}>Refund address <span style={{ fontWeight: 400, opacity: .6, fontSize: '0.8em' }}>(optional)</span></h2>
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="rf-coin">Coin</label>
                  <select id="rf-coin" className={styles.select} value={method === 'crypto' ? coin : refund.currency} disabled={method === 'crypto'} onChange={e => setRefund(r => ({ ...r, currency: e.target.value }))}>
                    {['BTC', 'LTC', 'ETH', 'DOGE', 'XMR'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <Field label={`Your ${method === 'crypto' ? coin : refund.currency} address`} name="rf-addr" autoComplete="off" placeholder="Leave empty if you prefer" value={refund.address} onChange={e => setRefund(r => ({ ...r, address: e.target.value }))} />
              </div>
              <p className={styles.optionHint}>
                {method === 'crypto' ? 'Where we send the coin back if a payment arrives late, short or too large, or if the order is refunded.' : 'Only used should your order be refunded. It goes on your order.'}
              </p>
            </div>

            <aside className={styles.orderSummary}>
              <h2 className={styles.sectionTitle}>Your Order</h2>

              <div className={styles.orderHeader}>
                <span>Product</span>
                <span>Subtotal</span>
              </div>

              {items.map(item => (
                <div key={lineKey(item)} className={styles.orderItem}>
                  <span className={styles.orderItemName}>{item.name} <strong>× {item.quantity}</strong></span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}

              <div className={styles.orderRow}>
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className={styles.orderRow}>
                <span>Delivery</span>
                <span>{!delivery ? 'None' : shippingFee === 0 ? 'Free' : formatPrice(shippingFee)}</span>
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
                {loading ? 'Placing Order…' : method === 'crypto' ? `Continue to payment · ${formatPrice(total)}` : 'Place Order'}
              </button>
              {touched && !addressOk && (
                <p style={{ fontSize: 'var(--font-size-small)', color: '#cf2e2e', textAlign: 'center', marginTop: 8 }}>Please complete your delivery address.</p>
              )}
            </aside>
          </div>
        </form>
      </div>
    </main>
  )
}

function Field({ label, name, type = 'text', value, onChange, error, placeholder, autoComplete, inputMode, maxLength }) {
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
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
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

// Paid: the order number. The invoice (a copy of the order) just goes to Telegram
function OrderPlaced({ orderNumber, invoice, onContinue }) {
  return (
    <main className="site-main">
      <div className="alignwide">
        <div className={styles.success}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.successTitle}>Order confirmed</h1>
          <p className={styles.successMsg}>
            Order <strong>#{orderNumber}</strong> is paid. The shop will contact you on Telegram to finish up.
          </p>
          {invoice && (
            <p className={styles.invoiceNote}>
              {invoice.delivered ? 'Your invoice has been sent to the shop on Telegram.' : 'Open Telegram to send your invoice to the shop.'}
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
            {invoice?.shopTelegramUrl && <a className={'wp-element-button ' + styles.telegramBtn} href={invoice.shopTelegramUrl} target="_blank" rel="noreferrer">Open Telegram</a>}
            <button onClick={onContinue} className="wp-element-button">Continue shopping</button>
            <Link to="/wallet" className="wp-element-button">View wallet</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
