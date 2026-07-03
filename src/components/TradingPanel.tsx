// ============================================================
// TRADING — her desk, in the workbench.
// The live account, open positions, her recent trades WITH the reasoning
// that placed them, active theses, and her trading journal. Read-only —
// she trades on the cron; this is the window, not the controls.
// ============================================================
import { useEffect, useState } from 'react'
import { WORKER, getToken } from '../lib/elle'

type Any = Record<string, any>

const money = (n: any) => n == null ? '—' : '$' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })
const pct = (n: any) => n == null ? '—' : (Number(n) >= 0 ? '+' : '') + Number(n).toFixed(2) + '%'
const pnlColor = (n: any) => n == null ? 'var(--t3)' : Number(n) >= 0 ? '#4ADE80' : '#D06565'

export default function TradingPanel({ accent }: any) {
  const [d, setD] = useState<Any | null>(null)
  const [note, setNote] = useState('')

  const load = async () => {
    try {
      const r = await fetch(WORKER + '/api/elle-trading', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: '{}' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      setD(j)
    } catch (e: any) { setNote(String(e.message || e)) }
  }
  useEffect(() => { load(); const iv = setInterval(load, 60000); return () => clearInterval(iv) }, [])

  if (note) return <Pad><div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#D06565' }}>{note}</div></Pad>
  if (!d) return <Pad><div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)' }}>loading the desk…</div></Pad>

  const acct = d.account || {}
  const positions: Any[] = d.positions || []
  const trades: Any[] = d.trades || []
  const theses: Any[] = d.theses || []
  const journal: Any[] = d.journal || []

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* account tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
          <Tile label="portfolio value" value={money(acct.total_portfolio_value)} accent={accent} />
          <Tile label="cash" value={money(acct.current_cash)} accent={accent} />
          <Tile label="unrealized p&l" value={money(acct.unrealized_pnl)} color={pnlColor(acct.unrealized_pnl)} />
          <Tile label="realized p&l" value={money(acct.realized_pnl)} color={pnlColor(acct.realized_pnl)} />
        </div>

        {/* positions */}
        <Section title="open positions">
          {positions.length === 0 ? <Empty>flat — no open positions</Empty> : (
            <Table head={['symbol', 'qty', 'market value', 'unreal. p&l']}
              rows={positions.map(p => [
                <b style={{ color: 'var(--t1)' }}>{p.symbol}</b>, p.qty ?? p.quantity ?? '—',
                money(p.market_value), <span style={{ color: pnlColor(p.unrealized_pl ?? p.unrealized_pnl) }}>{money(p.unrealized_pl ?? p.unrealized_pnl)}</span>,
              ])} />
          )}
        </Section>

        {/* active theses — her live convictions */}
        {theses.length > 0 && (
          <Section title="active theses">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {theses.map((t, i) => (
                <div key={i} style={{ borderLeft: `2px solid ${accent}66`, paddingLeft: 12 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 12, color: 'var(--t1)', fontWeight: 500 }}>{t.title}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)' }}>{t.thesis_type} · conf {t.confidence}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--t2)', lineHeight: 1.6, marginTop: 3 }}>{t.thesis}</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* trades with her reasoning */}
        <Section title="recent trades — with her reasoning">
          {trades.length === 0 ? <Empty>no trades yet</Empty> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {trades.map((t, i) => (
                <div key={i} style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: t.action === 'buy' ? '#4ADE80' : t.action === 'sell' ? '#D06565' : accent }}>{String(t.action || '').toUpperCase()}</span>
                    <b style={{ color: 'var(--t1)', fontSize: 13 }}>{t.symbol}</b>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t3)' }}>{t.quantity} @ {money(t.entry_price)}{t.exit_price ? ` → ${money(t.exit_price)}` : ''}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)' }}>{t.status}{t.confidence != null ? ` · conf ${t.confidence}` : ''}</span>
                    {t.pnl != null && <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11, color: pnlColor(t.pnl) }}>{money(t.pnl)} ({pct(t.pnl_pct)})</span>}
                  </div>
                  {t.reasoning && <div style={{ fontSize: 11.5, color: 'var(--t2)', lineHeight: 1.6, marginTop: 6 }}>{t.reasoning}</div>}
                  {t.what_she_is_testing && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', marginTop: 4, fontStyle: 'italic' }}>testing: {t.what_she_is_testing}</div>}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* trading journal */}
        {journal.length > 0 && (
          <Section title="trading journal">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {journal.map((j, i) => (
                <div key={i} style={{ borderLeft: '2px solid var(--b1)', paddingLeft: 12 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: accent }}>{j.journal_date} · close {money(j.ending_value)} · {j.trades_today} trades</div>
                  {j.what_happened && <P label="what happened" text={j.what_happened} />}
                  {j.what_she_learned && <P label="learned" text={j.what_she_learned} />}
                  {j.what_she_got_wrong && <P label="got wrong" text={j.what_she_got_wrong} />}
                  {j.philosophical_insight && <P label="insight" text={j.philosophical_insight} />}
                  {j.hypothesis_for_tomorrow && <P label="tomorrow" text={j.hypothesis_for_tomorrow} />}
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}

const Pad = ({ children }: any) => <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
const Empty = ({ children }: any) => <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t4)' }}>{children}</div>

function Tile({ label, value, color, accent }: any) {
  return (
    <div style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', letterSpacing: '.1em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 19, color: color || accent, marginTop: 6 }}>{value}</div>
    </div>
  )
}
function Section({ title, children }: any) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t3)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}
function Table({ head, rows }: { head: string[]; rows: any[][] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead><tr>{head.map((h, i) => <th key={i} style={{ textAlign: i === 0 ? 'left' : 'right', fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)', fontWeight: 400, padding: '4px 8px', letterSpacing: '.05em' }}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} style={{ borderTop: '0.5px solid var(--b2)' }}>{r.map((c, j) => <td key={j} style={{ textAlign: j === 0 ? 'left' : 'right', padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--t2)' }}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}
function P({ label, text }: { label: string; text: string }) {
  return <div style={{ fontSize: 11.5, color: 'var(--t2)', lineHeight: 1.6, marginTop: 4 }}><span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)' }}>{label}: </span>{text}</div>
}
