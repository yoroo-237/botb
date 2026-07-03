import { useState, useEffect } from 'react'
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
  const [sweepLoading, setSweepLoading] = useState(false)
  const [sweepResult, setSweepResult] = useState('')

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

  async function handleEthSweep() {
    setSweepLoading(true)
    setSweepResult('')
    try {
      const data = await adminFetch('/admin/eth/sweep', { method: 'POST' })
      setSweepResult('Sweep initiated: ' + JSON.stringify(data))
    } catch (e) {
      setSweepResult('Error: ' + e.message)
    } finally {
      setSweepLoading(false)
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
              <h2 className="admin-card-title">Crypto Addresses</h2>
              {['btc', 'doge', 'ltc', 'eth', 'xmr'].map(c => (
                <div key={c} className="admin-form-group">
                  <label className="admin-label">{c.toUpperCase()} Address</label>
                  <input className="admin-input" value={settings[`${c}_address`] || ''} onChange={e => setS(`${c}_address`, e.target.value)} placeholder={`${c.toUpperCase()} wallet address`} />
                </div>
              ))}
              <hr className="admin-divider" />
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px' }}>ETH Sweep</h3>
                <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '12px' }}>
                  Sweep all ETH from deposit addresses to the master wallet.
                </p>
                {sweepResult && (
                  <div style={{ background: '#f0f4ff', border: '1px solid #c8d4ff', borderRadius: '6px', padding: '10px', marginBottom: '12px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    {sweepResult}
                  </div>
                )}
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={handleEthSweep}
                  disabled={sweepLoading}
                >
                  {sweepLoading ? 'Sweeping…' : 'Run ETH Sweep'}
                </button>
              </div>
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
