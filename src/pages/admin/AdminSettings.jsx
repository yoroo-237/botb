import { useState, useEffect, useRef } from 'react'
import { adminFetch } from './utils/api.js'

const TABS = ['General', 'Shipping', 'Loyalty', 'Deposits', 'Crypto']

function Toggle({ checked, onChange }) {
  return (
    <label className="admin-switch">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="admin-slider" />
    </label>
  )
}

export default function AdminSettings() {
  const [tab, setTab] = useState('General')
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [sweepLoading, setSweepLoading] = useState({})
  const [sweepResult, setSweepResult] = useState({})
  const [showSeed, setShowSeed] = useState(false)

  useEffect(() => {
    adminFetch('/admin/settings')
      .then(d => setSettings(d.settings || d || {}))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function setS(key, value) {
    setSettings(s => ({ ...s, [key]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSuccess('')
    setError('')
    try {
      await adminFetch('/admin/settings', { method: 'PUT', body: JSON.stringify(settings) })
      setSuccess('Settings saved successfully.')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSweep(currency) {
    setSweepLoading(v => ({ ...v, [currency]: true }))
    setSweepResult(v => ({ ...v, [currency]: '' }))
    try {
      const url = currency === 'ETH' ? '/admin/eth/sweep' : `/admin/settings/sweep/${currency.toLowerCase()}`
      const data = await adminFetch(url, { method: 'POST' })
      const msg = currency === 'ETH'
        ? 'Sweep initiated: ' + JSON.stringify(data)
        : `Swept ${data.swept ?? 0} address(es). ` + JSON.stringify(data.details ?? [])
      setSweepResult(v => ({ ...v, [currency]: msg }))
    } catch (e) {
      setSweepResult(v => ({ ...v, [currency]: 'Error: ' + e.message }))
    } finally {
      setSweepLoading(v => ({ ...v, [currency]: false }))
    }
  }

  if (loading) return <div style={{ padding: '40px', color: '#888' }}>Loading settings…</div>

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Settings</h1>
          <p className="admin-page-subtitle">Manage site configuration</p>
        </div>
      </div>

      {success && <div style={{ background: '#d4edda', color: '#155724', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>{success}</div>}
      {error && <div style={{ background: '#f8d7da', color: '#721c24', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>{error}</div>}

      <div className="admin-tabs">
        {TABS.map(t => (
          <button key={t} className={'admin-tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <form onSubmit={handleSave}>
        <div className="admin-card">
          {tab === 'General' && (
            <>
              <h2 className="admin-card-title">General Settings</h2>
              <div className="admin-form-group">
                <label className="admin-label">Site Name</label>
                <input className="admin-input" value={settings.site_name || ''} onChange={e => setS('site_name', e.target.value)} />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Maintenance Mode</label>
                <div className="admin-toggle">
                  <Toggle checked={!!settings.maintenance_mode} onChange={v => setS('maintenance_mode', v)} />
                  <span style={{ fontSize: '0.875rem', color: '#555' }}>
                    {settings.maintenance_mode ? 'Enabled — site is in maintenance' : 'Disabled'}
                  </span>
                </div>
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Registration Open</label>
                <div className="admin-toggle">
                  <Toggle checked={!!settings.registration_open} onChange={v => setS('registration_open', v)} />
                  <span style={{ fontSize: '0.875rem', color: '#555' }}>
                    {settings.registration_open ? 'Open' : 'Closed'}
                  </span>
                </div>
              </div>
            </>
          )}

          {tab === 'Shipping' && (
            <>
              <h2 className="admin-card-title">Shipping Settings</h2>
              <div className="admin-form-group">
                <label className="admin-label">Shipping Cost ($)</label>
                <input className="admin-input" type="number" step="0.01" value={settings.shipping_cost ?? ''} onChange={e => setS('shipping_cost', e.target.value)} />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Free Shipping Threshold ($)</label>
                <input className="admin-input" type="number" step="0.01" value={settings.shipping_free_threshold ?? ''} onChange={e => setS('shipping_free_threshold', e.target.value)} />
              </div>
              <div className="admin-grid-2">
                <div className="admin-form-group">
                  <label className="admin-label">Shipping Deadline (Hours)</label>
                  <input className="admin-input" type="number" value={settings.shipping_deadline_h ?? ''} onChange={e => setS('shipping_deadline_h', e.target.value)} />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Shipping Deadline (Minutes)</label>
                  <input className="admin-input" type="number" value={settings.shipping_deadline_m ?? ''} onChange={e => setS('shipping_deadline_m', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {tab === 'Loyalty' && (
            <>
              <h2 className="admin-card-title">Loyalty Settings</h2>
              <div className="admin-form-group">
                <label className="admin-label">Points Rate (points per $1 spent)</label>
                <input className="admin-input" type="number" step="0.01" value={settings.points_rate ?? ''} onChange={e => setS('points_rate', e.target.value)} />
              </div>
              <hr className="admin-divider" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '12px' }}>Tier Thresholds (read-only)</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Tier</th><th>Min Spent ($)</th><th>Cashback Rate</th></tr>
                  </thead>
                  <tbody>
                    {(settings.tiers || [
                      { name: 'Bronze', minSpent: 0, cashbackRate: 0 },
                      { name: 'Silver', minSpent: 500, cashbackRate: 0.02 },
                      { name: 'Gold', minSpent: 2000, cashbackRate: 0.05 },
                      { name: 'Platinum', minSpent: 5000, cashbackRate: 0.08 },
                      { name: 'Diamond', minSpent: 10000, cashbackRate: 0.12 },
                    ]).map(t => (
                      <tr key={t.name}>
                        <td>{t.name}</td>
                        <td>${t.minSpent}</td>
                        <td>{(t.cashbackRate * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'Deposits' && (
            <>
              <h2 className="admin-card-title">Deposit Settings</h2>
              <div className="admin-form-group">
                <label className="admin-label">Deposit Expiry (Hours)</label>
                <input className="admin-input" type="number" value={settings.deposit_expiry_hours ?? ''} onChange={e => setS('deposit_expiry_hours', e.target.value)} />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Minimum Deposit ($)</label>
                <input className="admin-input" type="number" step="0.01" value={settings.min_deposit ?? ''} onChange={e => setS('min_deposit', e.target.value)} />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Maximum Deposit ($)</label>
                <input className="admin-input" type="number" step="0.01" value={settings.max_deposit ?? ''} onChange={e => setS('max_deposit', e.target.value)} />
              </div>
            </>
          )}

          {tab === 'Crypto' && (
            <>
              <h2 className="admin-card-title">HD Wallet Seed — BTC / LTC / DOGE</h2>
              <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '0.82rem', color: '#7a5200', lineHeight: 1.5 }}>
                <strong>Security notice:</strong> This 12-word mnemonic generates all BTC, LTC and DOGE deposit addresses. Keep it secret — anyone with access to it can sweep funds. It is stored in the database.
              </div>
              <div className="admin-form-group">
                <label className="admin-label">BTC / LTC / DOGE HD Seed (12 words)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="admin-input"
                    type={showSeed ? 'text' : 'password'}
                    value={settings.btc_hd_seed || ''}
                    onChange={e => setS('btc_hd_seed', e.target.value)}
                    placeholder="word1 word2 word3 … word12"
                    style={{ fontFamily: 'monospace', flex: 1 }}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => setShowSeed(v => !v)}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {showSeed ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#888' }}>
                  Leave blank to use the <code>BTC_HD_SEED</code> environment variable. Addresses are derived as <code>m/44'/0'/0'/0/depositId</code> (BTC), <code>m/44'/2'/0'/0/depositId</code> (LTC), <code>m/44'/3'/0'/0/depositId</code> (DOGE).
                </p>
              </div>

              <hr className="admin-divider" />
              <h2 className="admin-card-title" style={{ marginTop: 0 }}>Destination Addresses</h2>
              <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: '14px' }}>
                Used for ETH sweep and reference. BTC/LTC/DOGE deposits arrive directly at the derived HD address — transfer them manually to your main wallet using the same seed.
              </p>
              {['btc', 'doge', 'ltc', 'eth', 'xmr'].map(c => (
                <div key={c} className="admin-form-group">
                  <label className="admin-label">{c.toUpperCase()} Address</label>
                  <input className="admin-input" value={settings[`${c}_address`] || ''} onChange={e => setS(`${c}_address`, e.target.value)} placeholder={`${c.toUpperCase()} wallet address`} />
                </div>
              ))}
              <hr className="admin-divider" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px' }}>Sweep to Destination</h3>
              <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '16px' }}>
                Transfer funds from all deposit addresses to the destination addresses configured above.
              </p>
              {['BTC', 'LTC', 'DOGE', 'ETH'].map(cur => (
                <div key={cur} style={{ marginBottom: '16px', padding: '14px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sweepResult[cur] ? '10px' : 0 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cur} Sweep</span>
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      onClick={() => handleSweep(cur)}
                      disabled={!!sweepLoading[cur]}
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                    >
                      {sweepLoading[cur] ? 'Sweeping…' : `Run ${cur} Sweep`}
                    </button>
                  </div>
                  {sweepResult[cur] && (
                    <div style={{ background: '#fff', border: '1px solid #c8d4ff', borderRadius: '6px', padding: '8px 10px', fontSize: '0.78rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {sweepResult[cur]}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          <hr className="admin-divider" />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
