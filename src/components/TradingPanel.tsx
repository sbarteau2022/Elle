// ============================================================
// TRADING — her desk, in the workbench.
// The live account, open positions, her recent trades WITH the reasoning
// that placed them, active theses, market observations, and her trading
// journal. Read-only, deliberately — she trades on the cron; this is the
// window, not the controls. "Interactive" here means better BROWSING of
// what's already there (filter, sort, more of the reasoning surfaced), not
// new ability to move money.
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { WORKER, getToken } from '../lib/elle'

type Any = Record<string, any>

const money = (n: any) => n == null ? '—' : '$' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })
const pct = (n: any) => n == null ? '—' : (Number(n) >= 0 ? '+' : '') + Number(n).toFixed(2) + '%'
const pnlColor = (n: any) => n == null ? 'var(--t3)' : Number(n) >= 0 ? '#4ADE80' : '#D06565'
const verdictColor = (v: any, accent: string) =>
  v === 'buy' ? '#4ADE80' : v === 'short' ? '#D06565' : v === 'avoid' ? 'var(--t4)' : accent
const TRADE_ACTIONS = ['all', 'buy', 'sell', 'short', 'cover', 'watch', 'hold']
const TRADE_STATUSES = ['all', 'open', 'closed']
const TRADE_SORTS = [
  { id: 'recent', label: 'most recent' },
  { id: 'pnl', label: 'p&l' },
  { id: 'confidence', label: 'confidence' },
] as const

export default function TradingPanel({ accent }: any) {
  const [d, setD] = useState<Any | null>(null)
  const [note, setNote] = useState('')
  const [symbolFilter, setSymbolFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState<typeof TRADE_SORTS[number]['id']>('recent')

  const load = async () => {
    try {
      const r = await fetch(WORKER + '/api/elle-trading', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: '{}' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      setD(j)
    } catch (e: any) { setNote(String(e.message || e)) }
  }
  useEffect(() => { load(); const iv = setInterval(load, 60000); return () => clearInterval(iv) }, [])

  const acct = d?.account || {}
  const positions: Any[] = d?.positions || []
  const trades: Any[] = d?.trades || []
  const theses: Any[] = d?.theses || []
  const journal: Any[] = d?.journal || []
  const observations: Any[] = d?.observations || []
  const research: Any[] = d?.research || []
  const marketOpen = d?.market_open !== false
  // Today's trades, for the off-hours replay header.
  const today = new Date().toISOString().slice(0, 10)
  const todays = trades.filter(t => String(t.created_at || '').slice(0, 10) === today)
  const todayPnl = todays.reduce((s, t) => s + (Number(t.pnl) || 0), 0)

  const visibleTrades = useMemo(() => {
    const q = symbolFilter.trim().toUpperCase()
    let out = trades.filter(t =>
      (!q || String(t.symbol || '').toUpperCase().includes(q)) &&
      (actionFilter === 'all' || t.action === actionFilter) &&
      (statusFilter === 'all' || t.status === statusFilter))
    if (sortBy === 'pnl') out = [...out].sort((a, b) => (Number(b.pnl) || 0) - (Number(a.pnl) || 0))
    else if (sortBy === 'confidence') out = [...out].sort((a, b) => (Number(b.confidence) || 0) - (Number(a.confidence) || 0))
    // 'recent' is already the API's order (created_at DESC) — no re-sort needed
    return out
  }, [trades, symbolFilter, actionFilter, statusFilter, sortBy])

  if (note) return <Pad><div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#D06565' }}>{note}</div></Pad>
  if (!d) return <Pad><div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)' }}>loading the desk…</div></Pad>

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* market status + off-hours session replay: when the desk is closed,
            lead with what Elle did today rather than a frozen board. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', fontSize: 10 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: marketOpen ? '#4ADE80' : 'var(--t4)' }} />
          <span style={{ color: marketOpen ? '#4ADE80' : 'var(--t3)', letterSpacing: '.06em' }}>
            {marketOpen ? 'MARKET OPEN · live desk' : 'MARKET CLOSED · session replay'}
          </span>
        </div>
        {!marketOpen && (
          <div style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t3)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>
              today's session · what Elle did
            </div>
            {journal[0] && journal[0].journal_date >= today ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: accent }}>
                  close {money(journal[0].ending_value)} · {journal[0].trades_today} trades
                </div>
                {journal[0].what_happened && <P label="what happened" text={journal[0].what_happened} />}
                {journal[0].what_she_learned && <P label="learned" text={journal[0].what_she_learned} />}
                {journal[0].philosophical_insight && <P label="insight" text={journal[0].philosophical_insight} />}
                {journal[0].hypothesis_for_tomorrow && <P label="tomorrow" text={journal[0].hypothesis_for_tomorrow} />}
              </div>
            ) : (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t2)', lineHeight: 1.6 }}>
                {todays.length > 0
                  ? <>She placed <b style={{ color: 'var(--t1)' }}>{todays.length}</b> {todays.length === 1 ? 'trade' : 'trades'} today, {todayPnl >= 0 ? 'up' : 'down'} <span style={{ color: pnlColor(todayPnl) }}>{money(Math.abs(todayPnl))}</span>. Her end-of-day journal posts after the close.</>
                  : 'Quiet session — no trades today. The desk below is her live paper account; her end-of-day journal will post after the next close.'}
              </div>
            )}
          </div>
        )}

        {/* account tiles — day p&l is the real synced field; the old
            "realized p&l" tile read a column the account table never had and
            rendered an eternal em-dash. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
          <Tile label="portfolio value" value={money(acct.total_portfolio_value)} accent={accent} />
          <Tile label="cash" value={money(acct.current_cash)} accent={accent} />
          <Tile label="unrealized p&l" value={money(acct.unrealized_pnl)} color={pnlColor(acct.unrealized_pnl)} />
          <Tile label="day p&l" value={money(acct.day_pnl)} color={pnlColor(acct.day_pnl)} />
        </div>

        {/* positions */}
        <Section title="open positions">
          {positions.length === 0 ? <Empty>flat — no open positions</Empty> : (
            <Table head={['symbol', 'side', 'qty', 'entry', 'current', 'market value', 'unreal. p&l', '%']}
              rows={positions.map(p => [
                <b style={{ color: 'var(--t1)' }}>{p.symbol}</b>,
                <span style={{ textTransform: 'uppercase', fontSize: 10.5, color: 'var(--t3)' }}>{p.side || '—'}</span>,
                p.qty ?? p.quantity ?? '—',
                money(p.entry_price), money(p.current_price),
                money(p.market_value),
                <span style={{ color: pnlColor(p.unrealized_pl ?? p.unrealized_pnl) }}>{money(p.unrealized_pl ?? p.unrealized_pnl)}</span>,
                <span style={{ color: pnlColor(p.unrealized_pnl_pct) }}>{pct(p.unrealized_pnl_pct)}</span>,
              ])} />
          )}
        </Section>

        {/* active theses — her live convictions. Always visible: an empty
            surface with an explanation beats a section that silently doesn't
            exist (the black-box feel was mostly hidden-when-empty sections). */}
        <Section title="active theses">
          {theses.length === 0 ? <Empty>no active theses yet — the trading cycle writes these as convictions form</Empty> : (
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
          )}
        </Section>

        {/* research desk — symbols she scouted and researched herself, once per
            trading day. Each note is her own grounded web research: why she
            picked it, what she found, the thesis, catalyst, risks, verdict. */}
        <Section title="research desk — symbols she picked herself">
          {research.length === 0 ? <Empty>nothing researched yet — the scout runs once per trading day and logs its notes here</Empty> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {research.map((r, i) => (
                <div key={r.id || i} style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <b style={{ color: 'var(--t1)', fontSize: 13 }}>{r.symbol}</b>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: verdictColor(r.verdict, accent), border: `0.5px solid ${verdictColor(r.verdict, accent)}66`, borderRadius: 4, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      {r.verdict || 'watch'}
                    </span>
                    {r.confidence != null && <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)' }}>conf {Number(r.confidence).toFixed(2)}</span>}
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)' }}>{String(r.created_at || '').slice(0, 10)}</span>
                  </div>
                  {r.picked_because && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', marginTop: 5, fontStyle: 'italic' }}>picked because: {r.picked_because}</div>}
                  {r.thesis && <div style={{ fontSize: 11.5, color: 'var(--t1)', lineHeight: 1.6, marginTop: 6 }}>{r.thesis}</div>}
                  {r.findings && <div style={{ fontSize: 11.5, color: 'var(--t2)', lineHeight: 1.6, marginTop: 4 }}>{r.findings}</div>}
                  {(r.expected_catalyst || r.risks) && (
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {r.expected_catalyst && <span>catalyst: {r.expected_catalyst}</span>}
                      {r.risks && <span>risks: {r.risks}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* market observations — what she's noticing, separate from what she acted on */}
        <Section title="market observations">
          {observations.length === 0 ? <Empty>nothing noted yet — observations land here from the 15-minute market cycle</Empty> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {observations.map((o, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)' }}>{o.observation_type}{o.symbol ? ` · ${o.symbol}` : ''}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--t2)' }}>{o.observation}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* trades with her reasoning */}
        <Section title="recent trades — with her reasoning">
          {trades.length === 0 ? <Empty>no trades yet</Empty> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  value={symbolFilter} onChange={e => setSymbolFilter(e.target.value)}
                  placeholder="filter by symbol…"
                  style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: '5px 9px', fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t1)', width: 140 }}
                />
                <Select value={actionFilter} onChange={setActionFilter} options={TRADE_ACTIONS} />
                <Select value={statusFilter} onChange={setStatusFilter} options={TRADE_STATUSES} />
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)' }}>sort</span>
                <Select value={sortBy} onChange={v => setSortBy(v as typeof sortBy)} options={TRADE_SORTS.map(s => s.id)} labels={Object.fromEntries(TRADE_SORTS.map(s => [s.id, s.label]))} />
              </div>
              {visibleTrades.length === 0 ? <Empty>no trades match that filter</Empty> : visibleTrades.map((t, i) => (
                <div key={i} style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: t.action === 'buy' || t.action === 'cover' ? '#4ADE80' : t.action === 'sell' || t.action === 'short' ? '#D06565' : accent }}>{String(t.action || '').toUpperCase()}</span>
                    <b style={{ color: 'var(--t1)', fontSize: 13 }}>{t.underlying_symbol || t.symbol}</b>
                    {t.asset_class === 'option' && (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: accent, border: `0.5px solid ${accent}66`, borderRadius: 4, padding: '1px 5px' }}>
                        {String(t.option_right || '').toUpperCase()} ${t.strike_price} · exp {t.expiration_date}
                      </span>
                    )}
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t3)' }}>{t.quantity} @ {money(t.entry_price)}{t.exit_price ? ` → ${money(t.exit_price)}` : ''}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)' }}>{t.status}{t.confidence != null ? ` · conf ${t.confidence}` : ''}</span>
                    {t.source && (
                      <span title={t.source === 'chat' ? 'placed in conversation via trade_execute' : 'placed by the autonomous trading cycle'}
                        style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', border: '0.5px solid var(--b2)', borderRadius: 4, padding: '1px 5px' }}>
                        {t.source === 'chat' ? 'via chat' : 'autonomous'}
                      </span>
                    )}
                    {t.pnl != null && <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11, color: pnlColor(t.pnl) }}>{money(t.pnl)} ({pct(t.pnl_pct)})</span>}
                  </div>
                  {t.reasoning && <div style={{ fontSize: 11.5, color: 'var(--t2)', lineHeight: 1.6, marginTop: 6 }}>{t.reasoning}</div>}
                  {t.what_she_is_testing && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', marginTop: 4, fontStyle: 'italic' }}>testing: {t.what_she_is_testing}</div>}
                  {(t.expected_catalyst || t.expected_timeframe) && (
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {t.expected_catalyst && <span>catalyst: {t.expected_catalyst}</span>}
                      {t.expected_timeframe && <span>horizon: {t.expected_timeframe}</span>}
                    </div>
                  )}
                  {t.attribution && (
                    <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.6, marginTop: 8, paddingTop: 8, borderTop: '0.5px solid var(--b2)' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)' }}>attribution: </span>{t.attribution}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* trading journal */}
        <Section title="trading journal">
          {journal.length === 0 ? <Empty>no entries yet — the day's journal posts after the US close (~21:10 UTC)</Empty> : (
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
          )}
        </Section>
      </div>
    </div>
  )
}

const Pad = ({ children }: any) => <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
const Empty = ({ children }: any) => <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t4)' }}>{children}</div>

function Select({ value, onChange, options, labels }: { value: string; onChange: (v: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: '5px 8px', fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t1)' }}
    >
      {options.map(o => <option key={o} value={o}>{labels?.[o] || o}</option>)}
    </select>
  )
}

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
