import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useApp } from '../../context/AppContext.jsx'
import { apiFetch } from '../../utils/api.js'
import styles from './WalletPage.module.css'

const CURRENCIES = [
  { id: 'BTC', label: 'BTC', color: '#f7931a', symbol: '₿', prefix: 'bitcoin' },
  { id: 'LTC', label: 'LTC', color: '#345d9d', symbol: 'Ł', prefix: 'litecoin' },
  { id: 'DOGE', label: 'DOGE', color: '#c2a633', symbol: 'Ð', prefix: 'dogecoin' },
  { id: 'ETH', label: 'ETH', color: '#627eea', symbol: 'Ξ', prefix: 'ethereum' },
  { id: 'XMR', label: 'XMR', color: '#ff6600', symbol: 'ɱ', prefix: 'monero' },
]

const DEPOSIT_STATUS_MAP = {
  awaiting: styles.badgeAwaiting,
  confirmed: styles.badgeConfirmed,
  expired: styles.badgeExpired,
  partial: styles.badgePartial,
  pending: styles.badgePending,
}

const TERMS = [
  'All cryptocurrency deposits are final and non-refundable once confirmed on the blockchain.',
  'Deposit addresses are single-use. Do not reuse addresses from previous transactions.',
  'Minimum deposit amount may apply. Deposits below the minimum will not be credited.',
  'Processing times vary by cryptocurrency and network congestion.',
  'Bitcoin, Litecoin, Dogecoin, and Ethereum deposits are auto-confirmed after sufficient confirmations.',
  'Monero (XMR) deposits require manual review and may take longer to process.',
  'Do not send tokens or assets other than the specified cryptocurrency to these addresses.',
  'BOTB is not responsible for funds sent to incorrect addresses.',
  'Deposit expiry: addresses expire after the set time. Expired deposits must be opened again.',
  'By generating an address, you confirm you understand and accept these terms.',
]

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Countdown({ expiresAt }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    function tick() {
      const diff = new Date(expiresAt) - Date.now()
      if (diff <= 0) { setRemaining('Expired'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return (
    <div className={styles.countdown}>
      {remaining}
      <span className={styles.countdownLabel}>Time remaining</span>
    </div>
  )
}

function AddFundsModal({ onClose, onSuccess }) {
  const [step, setStep] = useState('select')
  const [currency, setCurrency] = useState('BTC')
  const [agreed, setAgreed] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [depositData, setDepositData] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const cur = CURRENCIES.find(c => c.id === currency)
  const uri = depositData ? `${cur.prefix}:${depositData.address}` : ''

  async function generate() {
    setGenerating(true)
    setError('')
    try {
      const data = await apiFetch('/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({ currency }),
      })
      setDepositData(data.deposit || data)
      setStep('address')
      onSuccess?.()
    } catch (err) {
      setError(err.message || 'Failed to generate address')
    } finally {
      setGenerating(false)
    }
  }

  function copyAddress() {
    if (depositData?.address) {
      navigator.clipboard.writeText(depositData.address).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button className={styles.modalClose} onClick={onClose} aria-label="Close">×</button>

        {step === 'select' && (
          <>
            <h2 className={styles.modalTitle}>Add Funds</h2>

            <div style={{ marginBottom: '16px', fontWeight: 600, fontSize: '0.875rem', color: '#444' }}>
              Select Currency
            </div>
            <div className={styles.currencyGrid}>
              {CURRENCIES.map(c => (
                <button
                  key={c.id}
                  className={styles.currencyBtn + (currency === c.id ? ' ' + styles.selected : '')}
                  onClick={() => setCurrency(c.id)}
                >
                  <span className={styles.currencyDot} style={{ background: c.color }}>{c.symbol}</span>
                  {c.label}
                </button>
              ))}
            </div>

            <div className={styles.termsBox}>
              <ol>
                {TERMS.map((t, i) => <li key={i}>{t}</li>)}
              </ol>
            </div>

            <label className={styles.termsCheck}>
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
              I have read and agree to the deposit terms above.
            </label>

            {error && <div style={{ color: '#dc3545', marginBottom: '12px', fontSize: '0.875rem' }}>{error}</div>}

            <button
              className={styles.generateBtn}
              onClick={generate}
              disabled={!agreed || generating}
            >
              {generating ? 'Generating…' : 'Generate Address'}
            </button>
          </>
        )}

        {step === 'address' && depositData && (
          <>
            <h2 className={styles.modalTitle}>Send {currency}</h2>

            <div className={styles.qrWrap}>
              <QRCodeSVG value={uri} size={180} />
            </div>

            {depositData.expiresAt && <Countdown expiresAt={depositData.expiresAt} />}

            <div className={styles.addrLabel}>Deposit Address</div>
            <div className={styles.addrRow}>
              <code className={styles.addrCode}>{depositData.address}</code>
              <button className={styles.copyBtn} onClick={copyAddress}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className={styles.howItWorks}>
              <div className={styles.howTitle}>How it works</div>
              {currency !== 'XMR' ? (
                <>
                  <span className={styles.autoBadge}> Auto-confirmed</span>
                  <p style={{ margin: 0 }}>
                    Your deposit will be automatically credited after sufficient blockchain confirmations.
                  </p>
                </>
              ) : (
                <>
                  <span className={styles.manualBadge}> Manual review</span>
                  <p style={{ margin: 0 }}>
                    XMR deposits require manual verification by our team.{' '}
                    <Link to="/support" className={styles.supportLink}>Contact support</Link> if you have questions.
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function WalletPage() {
  const { user, balance } = useApp()
  const [tab, setTab] = useState('deposits')
  const [deposits, setDeposits] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loadingDeposits, setLoadingDeposits] = useState(true)
  const [loadingTxns, setLoadingTxns] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const fetchDeposits = useCallback(async () => {
    setLoadingDeposits(true)
    try {
      const data = await apiFetch('/wallet/deposits')
      setDeposits(data.deposits || data || [])
    } catch {
      setDeposits([])
    } finally {
      setLoadingDeposits(false)
    }
  }, [])

  const fetchTransactions = useCallback(async () => {
    setLoadingTxns(true)
    try {
      const data = await apiFetch('/wallet/transactions')
      setTransactions(data.transactions || data || [])
    } catch {
      setTransactions([])
    } finally {
      setLoadingTxns(false)
    }
  }, [])

  useEffect(() => { fetchDeposits() }, [fetchDeposits])

  useEffect(() => {
    if (tab === 'history') fetchTransactions()
  }, [tab, fetchTransactions])

  function getStatusClass(status) {
    return DEPOSIT_STATUS_MAP[status?.toLowerCase()] || styles.badgePending
  }

  return (
    <main className="site-main" style={{ padding: 0 }}>
      <div className={styles.topBar}>
        <div className="alignwide" style={{ paddingLeft: 'var(--root-padding)', paddingRight: 'var(--root-padding)' }}>
          <div className={styles.topBarInner}>
            <div className={styles.balanceBlock}>
              <div className={styles.balanceLabel}>Wallet Balance</div>
              <div className={styles.balanceAmount}>${balance.toFixed(2)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {user?.tier && <span className={styles.tierBadge}>{user.tier}</span>}
              <button className={styles.addFundsBtn} onClick={() => setShowModal(true)}>
                + Add Funds
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="alignwide" style={{ paddingLeft: 'var(--root-padding)', paddingRight: 'var(--root-padding)', paddingBottom: '60px' }}>
        <div className={styles.tabs}>
          <button className={styles.tab + (tab === 'deposits' ? ' ' + styles.active : '')} onClick={() => setTab('deposits')}>
            Credit Deposits
          </button>
          <button className={styles.tab + (tab === 'history' ? ' ' + styles.active : '')} onClick={() => setTab('history')}>
            Credit History
          </button>
          <button className={styles.tab + (tab === 'legacy' ? ' ' + styles.active : '')} onClick={() => setTab('legacy')}>
            Legacy Credit History
          </button>
        </div>

        {tab === 'deposits' && (
          <div className={styles.tableWrap}>
            {loadingDeposits ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Loading deposits…</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Currency</th>
                    <th>Address</th>
                    <th>Created</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.length === 0 ? (
                    <tr><td colSpan={6} className={styles.empty}>No deposits found.</td></tr>
                  ) : deposits.map(d => (
                    <tr key={d.id}>
                      <td><code className={styles.code}>#{d.id}</code></td>
                      <td>
                        <span className={styles.badge + ' ' + getStatusClass(d.status)}>
                          {d.status || 'pending'}
                        </span>
                      </td>
                      <td><strong>{d.currency}</strong></td>
                      <td>
                        <span className={styles.code} title={d.address}>{d.address?.slice(0, 16)}…</span>
                      </td>
                      <td>{formatDate(d.createdAt)}</td>
                      <td>
                        <button
                          className={styles.detailsBtn}
                          onClick={() => alert(`Deposit ${d.id}\n\nAddress: ${d.address}\nExpected: ${d.expectedAmount ?? '—'}\nReceived: ${d.receivedAmount ?? '—'}`)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className={styles.tableWrap}>
            {loadingTxns ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Loading transactions…</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Note</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan={4} className={styles.empty}>No transactions found.</td></tr>
                  ) : transactions.map(t => (
                    <tr key={t.id}>
                      <td>{t.type || '—'}</td>
                      <td>
                        <span className={t.amount >= 0 ? styles.amountPos : styles.amountNeg}>
                          {t.amount >= 0 ? '+' : ''}{Number(t.amount).toFixed(2)}
                        </span>
                      </td>
                      <td>{t.note || '—'}</td>
                      <td>{formatDate(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'legacy' && (
          <div className={styles.placeholder}>No legacy history available.</div>
        )}
      </div>

      {showModal && (
        <AddFundsModal
          onClose={() => setShowModal(false)}
          onSuccess={() => fetchDeposits()}
        />
      )}
    </main>
  )
}
