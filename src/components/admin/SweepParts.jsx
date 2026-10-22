// Shared by Settings → Crypto (admins) and the super admin commission panel

export const COMMISSION_ADDR_KEY = {
  BTC: 'btcCommissionAddress', LTC: 'ltcCommissionAddress', DOGE: 'dogeCommissionAddress', ETH: 'ethCommissionAddress',
}

export const shortAddr = a => (a ? `${a.slice(0, 10)}…${a.slice(-6)}` : '—')

// "90% → bc1q…abcd · 10% commission → bc1p…wxyz" — shown before every sweep
export function SplitText({ commission, currency, mainAddr }) {
  const pct = Number(commission?.commissionPct ?? 0)
  const commAddr = commission?.[COMMISSION_ADDR_KEY[currency]]
  return (
    <span>
      {100 - pct}% → <span className="admin-code">{shortAddr(mainAddr)}</span>
      {pct > 0 && <> · <strong>{pct}% commission</strong> → <span className="admin-code">{shortAddr(commAddr)}</span></>}
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
            ? `✓ ${result.swept} address(es) swept (${result.currency}) — ${result.commissionPct}% commission applied`
            : `Nothing to sweep (${result.currency})`}
        </span>
        {onClose && <button type="button" className="admin-alert-close" onClick={onClose} aria-label="Dismiss">×</button>}
      </div>
      {result.swept > 0 && (
        <div style={{ fontSize: '0.8rem', marginBottom: '6px' }}>
          Total: {result.totalMain} {result.currency} to the main address
          {Number(result.totalCommission) > 0 && <> · {result.totalCommission} {result.currency} commission</>}
        </div>
      )}
      {(result.results || []).map((r, i) => (
        <div key={i} style={{ fontSize: '0.78rem', fontFamily: 'monospace', marginBottom: '4px', wordBreak: 'break-all' }}>
          <div>{r.amountMain} {result.currency} → main · tx {r.txHash ? `${r.txHash.slice(0, 16)}…` : '—'}</div>
          {Number(r.amountCommission) > 0 && (
            <div style={{ color: '#b45309' }}>
              {r.amountCommission} {result.currency} → commission
              {r.commissionTxHash && r.commissionTxHash !== r.txHash && <> · tx {r.commissionTxHash.slice(0, 16)}…</>}
            </div>
          )}
          {r.commissionError && <div style={{ color: '#dc2626' }}>Commission transfer failed ({r.commissionError}) — it will go out with the next sweep.</div>}
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
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr><th>Date</th><th>Currency</th><th>%</th><th>Main</th><th>Commission</th><th>Tx</th><th>By</th></tr>
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
              <td>{l.triggeredByUser?.username || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
