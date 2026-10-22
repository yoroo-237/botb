import { useState, useEffect, useCallback } from 'react'
import { adminFetch } from './utils/api.js'
import { COMMISSION_ADDR_KEY, SplitText, SweepResult, SweepLogTable } from '../../components/admin/SweepParts.jsx'

const CURRENCIES = [
  { id: 'BTC',  color: '#f7931a' },
  { id: 'LTC',  color: '#345d9d' },
  { id: 'DOGE', color: '#c2a633' },
  { id: 'ETH',  color: '#627eea' },
]

export default function AdminSuperDashboard() {
  const [form, setForm] = useState(null)          // editable commission settings
  const [commission, setCommission] = useState(null) // saved commission settings
  const [mainAddrs, setMainAddrs] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [error, setError] = useState('')

  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(true)

  const [sweepConfirm, setSweepConfirm] = useState(null)
  const [sweeping, setSweeping] = useState(null)
  const [sweepResult, setSweepResult] = useState(null)

  const loadLogs = useCallback(() => {
    adminFetch('/admin/superadmin/sweep-logs')
      .then(d => setLogs(d.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false))
  }, [])

  useEffect(() => {
    Promise.all([adminFetch('/admin/superadmin/settings'), adminFetch('/admin/settings')])
      .then(([c, s]) => {
        setCommission(c)
        setForm(c)
        setMainAddrs(s.settings || {})
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
    loadLogs()
  }, [loadLogs])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSavedMsg('') }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSavedMsg('')
    try {
      const updated = await adminFetch('/admin/superadmin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          commissionPct:         form.commissionPct,
          btcCommissionAddress:  form.btcCommissionAddress,
          ltcCommissionAddress:  form.ltcCommissionAddress,
          dogeCommissionAddress: form.dogeCommissionAddress,
          ethCommissionAddress:  form.ethCommissionAddress,
        }),
      })
      setCommission(updated)
      setForm(updated)
      setSavedMsg('Reserve fund settings saved.')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function doSweep(currency) {
    setSweepConfirm(null)
    setSweeping(currency)
    setSweepResult(null)
    try {
      const url = currency === 'ETH' ? '/admin/superadmin/eth/sweep' : `/admin/superadmin/utxo/sweep/${currency}`
      setSweepResult(await adminFetch(url, { method: 'POST' }))
      loadLogs()
    } catch (e) {
      setSweepResult({ currency, error: e.message })
    } finally {
      setSweeping(null)
    }
  }

  if (loading) return <div style={{ padding: '40px', color: '#888' }}>Loading…</div>
  if (!form) return <div className="admin-alert admin-alert-error">{error || 'Could not load reserve fund settings.'}</div>

  const pct = Number(commission?.commissionPct ?? 0)
  const dirty = JSON.stringify(form) !== JSON.stringify(commission)

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Super Admin — Reserve Fund</h1>
          <p className="admin-page-subtitle">Visible only to super admin accounts</p>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <div className="admin-card" style={{ maxWidth: '720px' }}>
        <h2 className="admin-card-title">Reserve Fund Settings</h2>
        <p style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.6, marginTop: 0 }}>
          Every sweep — from this panel or from Settings → Crypto — splits the swept funds: this percentage
          goes to the reserve fund address of the currency (shop expansion & platform maintenance), the rest to the site's destination address.
          Admins only see the rate and the amounts — the reserve addresses and reserve transaction hashes are shown here only. While a currency has no reserve address, its sweep is disabled.
        </p>
        <form onSubmit={save}>
          <div className="admin-form-group">
            <label className="admin-label">Reserve Fund %</label>
            <input
              className="admin-input" type="number" min="0" max="100" step="0.1" required
              value={form.commissionPct}
              onChange={e => set('commissionPct', e.target.value)}
              style={{ maxWidth: '140px' }}
            />
          </div>
          {CURRENCIES.map(({ id }) => (
            <div className="admin-form-group" key={id}>
              <label className="admin-label">{id} Reserve Fund Address</label>
              <input
                className="admin-input" type="text"
                value={form[COMMISSION_ADDR_KEY[id]] || ''}
                onChange={e => set(COMMISSION_ADDR_KEY[id], e.target.value.trim())}
                placeholder={`${id} address`}
                style={{ fontFamily: 'monospace' }}
                autoComplete="off"
              />
            </div>
          ))}
          <div className="admin-flex" style={{ flexWrap: 'wrap' }}>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving || !dirty}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            {savedMsg && <span style={{ color: '#198754', fontSize: '0.85rem', fontWeight: 600 }}>✓ {savedMsg}</span>}
            {dirty && !saving && <span className="admin-text-muted">Unsaved changes — sweeps use the saved values.</span>}
          </div>
        </form>
      </div>

      <div className="admin-card" style={{ maxWidth: '720px' }}>
        <h2 className="admin-card-title">Sweep with Reserve Fund Split</h2>
        <SweepResult result={sweepResult} onClose={() => setSweepResult(null)} />
        {CURRENCIES.map(({ id, color }) => {
          const mainAddr = mainAddrs[`${id.toLowerCase()}_address`]
          const blocker  = !mainAddr ? 'site destination address not set (Settings → Crypto)'
            : pct > 0 && !commission[COMMISSION_ADDR_KEY[id]] ? 'commission address not saved'
            : null
          return (
            <div key={id} className="admin-sweep-row">
              <span className="admin-badge" style={{ background: color + '22', color, border: `1px solid ${color}66` }}>{id}</span>
              {sweepConfirm === id ? (
                <>
                  <span style={{ fontSize: '0.82rem', color: '#b45309', fontWeight: 600, flex: 1, minWidth: 0 }}>
                    Sweep {id}: <SplitText commission={commission} currency={id} mainAddr={mainAddr} /> ?
                  </span>
                  <div className="admin-gap-actions">
                    <button type="button" className="admin-btn admin-btn-success admin-btn-sm" onClick={() => doSweep(id)}>Yes, sweep</button>
                    <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setSweepConfirm(null)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <span className="admin-text-muted" style={{ flex: 1, minWidth: 0 }}>
                    {blocker ? `Disabled — ${blocker}` : `${100 - pct}% / ${pct}%`}
                  </span>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary admin-btn-sm"
                    disabled={!!blocker || !!sweeping}
                    onClick={() => setSweepConfirm(id)}
                  >
                    {sweeping === id ? 'Sweeping…' : `Sweep ${id}`}
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      <div className="admin-card">
        <h2 className="admin-card-title">Reserve Fund History</h2>
        <SweepLogTable logs={logs} loading={logsLoading} />
      </div>
    </div>
  )
}
