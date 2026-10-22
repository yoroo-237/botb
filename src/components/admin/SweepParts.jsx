// Shared by Settings → Crypto (admins) and the super admin panel.
// Every sweep sends a share of the funds to the reserve fund (expansion & maintenance).
// Admins receive the rate and the amounts only; the reserve addresses and the reserve
// transfer hashes are returned by the API to the super admin only.

export const RESERVE_LABEL = 'Reserve fund (expansion & maintenance)'

export const COMMISSION_ADDR_KEY = {
  BTC: 'btcCommissionAddress', LTC: 'ltcCommissionAddress', DOGE: 'dogeCommissionAddress', ETH: 'ethCommissionAddress',
}

export const shortAddr = a => (a ? `${a.slice(0, 10)}…${a.slice(-6)}` : '—')

// Whether the reserve address of a currency is set — from the admin view (`configured`)
// or the super admin view (the address itself)
export const reserveConfigured = (commission, currency) =>
  !!(commission?.configured?.[currency] ?? commission?.[COMMISSION_ADDR_KEY[currency]])

// "90% → bc1q…abcd · 10% → reserve fund" — shown before every sweep
export function SplitText({ commission, currency, mainAddr }) {
  const pct = Number(commission?.commissionPct ?? 0)
  const reserveAddr = commission?.[COMMISSION_ADDR_KEY[currency]]
  return (
    <span>
      {100 - pct}% → <span className="admin-code">{shortAddr(mainAddr)}</span>
      {pct > 0 && (
        <> · <strong>{pct}% → reserve fund</strong>{reserveAddr && <> <span className="admin-code">{shortAddr(reserveAddr)}</span></>}</>
      )}
    </span>
  )
}

export function SweepResult({ result, onClose }) {
  if (!result) return null
  if (result.error) {
    return (
      <div className="admin-alert admin-alert-error">
        <span>{result.currency} sweep failed: {result.error}</span>
        {onClose && <button type="button" className="admin-alert-close" onClick={onClose} aria-label="Dismiss">×</button>}
      </div>
    )
  }
  const problems = (result.skipped || []).filter(s => s.reason)
  return (
    <div className={'admin-alert ' + (result.swept > 0 ? 'admin-alert-success' : 'admin-alert-info')} style={{ display: 'block' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontWeight: 700, marginBottom: '6px' }}>
        <span>
          {result.swept > 0
            ? `✓ ${result.swept} address(es) swept`
            : `Nothing to sweep (${result.currency})`}
        </span>
        {onClose && <button type="button" className="admin-alert-close" onClick={onClose} aria-label="Dismiss">×</button>}
      </div>
      {result.swept > 0 && (
        <div style={{ fontSize: '0.8rem', marginBottom: '6px' }}>
          Total: {result.totalMain} {result.currency} to the main address
          {Number(result.totalCommission) > 0 && <> ·</>}
        </div>
      )}
      {(result.results || []).map((r, i) => (
        <div key={i} style={{ fontSize: '0.78rem', fontFamily: 'monospace', marginBottom: '4px', wordBreak: 'break-all' }}>
          <div>{r.amountMain} {result.currency} → main · tx {r.txHash ? `${r.txHash.slice(0, 16)}…` : '—'}</div>
          {Number(r.amountCommission) > 0 && (
            <div style={{ color: '#b45309' }}>
              {r.amountCommission} {result.currency} → reserve fund
              {r.commissionTxHash && r.commissionTxHash !== r.txHash && <> · tx {r.commissionTxHash.slice(0, 16)}…</>}
            </div>
          )}
          {r.commissionError && <div style={{ color: '#dc2626' }}>Reserve transfer failed ({r.commissionError}).</div>}
        </div>
      ))}
      {problems.map((s, i) => (
        <div key={`s${i}`} style={{ fontSize: '0.78rem', color: '#b45309', wordBreak: 'break-all' }}>
          ⚠ #{s.depositId} {shortAddr(s.address)} — {s.reason}
        </div>
      ))}
    </div>
  )
}

export function SweepLogTable({ logs, loading }) {
  if (loading) return <div className="admin-text-muted">Loading…</div>
  if (!logs.length) return <div className="admin-text-muted">No sweeps yet.</div>
  // Reserve address / tx columns only exist in the super admin response
  const full = logs.some(l => 'commissionAddress' in l)
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Date</th><th>Currency</th><th>%</th><th>Main</th><th>Reserve Fund</th><th>Tx</th>
            {full && <th>Reserve Address</th>}
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(l => (
            <tr key={l.id}>
              <td style={{ whiteSpace: 'nowrap' }}>{new Date(l.createdAt).toLocaleString()}</td>
              <td>{l.currency}</td>
              <td>{Number(l.commissionPct)}%</td>
              <td className="admin-code">{Number(l.mainAmount)}</td>
              <td className="admin-code" style={{ color: '#b45309' }}>{Number(l.commissionAmount)}</td>
              <td><span className="admin-code" title={l.mainTxHash || ''}>{l.mainTxHash ? `${l.mainTxHash.slice(0, 10)}…` : '—'}</span></td>
              {full && <td><span className="admin-code" title={l.commissionAddress || ''}>{shortAddr(l.commissionAddress)}</span></td>}
              <td>{l.triggeredByUser?.username || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
