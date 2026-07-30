// ============================================================
// TAX — the small-business tax suite panel.
// Onboarding is just this panel's default tab until a business exists — no
// separate wizard route (no generic multi-step-form component exists
// elsewhere in this app; see TaxOnboarding.tsx's own header comment). One
// business selected at a time; the picker is hidden entirely when there's
// only one, matching every other panel's "don't show a control that has
// nothing to control" convention.
//
// Talks to two doors: /api/tax/data (structured JSON, no LLM round trip —
// what every tab below uses for its lists/tables/calculations) and
// /api/tax/onboarding (business + fact-group CRUD). The conversational
// /api/tax door (actually asking Elle about it) isn't used by this panel —
// that's reachable through the main `elle` chat panel like any other tool.
// ============================================================
import { useEffect, useState } from 'react'
import { WORKER, getToken } from '../lib/elle'
import TaxOnboarding from './TaxOnboarding'
import TaxDashboard from './TaxDashboard'
import TaxTransactions from './TaxTransactions'
import TaxContractors from './TaxContractors'
import TaxCredits from './TaxCredits'

export type Business = { id: string; name: string; entity_type: string }

async function post(url: string, body: Record<string, unknown>) {
  const r = await fetch(WORKER + url, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  })
  const d = await r.json().catch(() => ({} as any))
  if (!r.ok) throw new Error(String((d as any).error || `HTTP ${r.status}`))
  return d as any
}

export const taxApi = (op: string, extra: Record<string, unknown> = {}) => post('/api/tax/data', { op, ...extra })
export const taxOnboardingApi = (body: Record<string, unknown>) => post('/api/tax/onboarding', body)

const TABS = ['onboarding', 'dashboard', 'transactions', 'contractors', 'credits'] as const
type Tab = typeof TABS[number]
const TAB_LABEL: Record<Tab, string> = { onboarding: 'onboarding', dashboard: 'dashboard', transactions: 'transactions', contractors: '1099s', credits: 'credits' }

export default function TaxPanel({ accent }: any) {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessId, setBusinessId] = useState('')
  const [tab, setTab] = useState<Tab>('onboarding')
  const [note, setNote] = useState('')
  const taxYear = new Date().getFullYear()

  const loadBusinesses = async () => {
    try {
      const d = await taxApi('business_list')
      const list: Business[] = d.businesses || []
      setBusinesses(list)
      return list
    } catch (e: any) { setNote(String(e.message || e)); return [] }
  }

  useEffect(() => {
    loadBusinesses().then((list) => {
      if (list.length) { setBusinessId(list[0].id); setTab('dashboard') }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onBusinessCreated = async (id: string) => {
    await loadBusinesses()
    setBusinessId(id)
    setTab('dashboard')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '0.5px solid var(--b1)', flexWrap: 'wrap' }}>
        {businesses.length > 1 && (
          <Select value={businessId} onChange={setBusinessId} options={businesses.map((b) => b.id)} labels={Object.fromEntries(businesses.map((b) => [b.id, b.name]))} />
        )}
        {businesses.length === 1 && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t1)' }}>{businesses[0].name}</span>}
        <div style={{ display: 'flex', gap: 4, marginLeft: businesses.length ? 12 : 0 }}>
          {TABS.filter((t) => t === 'onboarding' || businessId).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                background: tab === t ? accent + '22' : 'none', border: `0.5px solid ${tab === t ? accent + '55' : 'var(--b1)'}`,
                borderRadius: 6, color: tab === t ? accent : 'var(--t3)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10.5, padding: '4px 10px',
              }}>
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
        {note && <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10, color: '#D06565' }}>{note}</span>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'onboarding' && <TaxOnboarding accent={accent} businessId={businessId} businesses={businesses} taxYear={taxYear} onBusinessCreated={onBusinessCreated} />}
        {tab === 'dashboard' && businessId && <TaxDashboard accent={accent} businessId={businessId} taxYear={taxYear} />}
        {tab === 'transactions' && businessId && <TaxTransactions accent={accent} businessId={businessId} taxYear={taxYear} />}
        {tab === 'contractors' && businessId && <TaxContractors accent={accent} businessId={businessId} taxYear={taxYear} />}
        {tab === 'credits' && businessId && <TaxCredits accent={accent} businessId={businessId} taxYear={taxYear} />}
      </div>
    </div>
  )
}

// ── shared helpers, reused by every sibling tab file (copied-in-file
// convention — see ConductorPanel.tsx/TradingPanel.tsx; no shared
// components/ui directory exists in this app) ──
export const Pad = ({ children }: any) => <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>{children}</div>
export const Empty = ({ children }: any) => <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t4)' }}>{children}</div>

export function Btn({ label, color, onClick, disabled }: { label: string; color: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: 'none', border: `0.5px solid ${color}44`, borderRadius: 4, color, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 8px' }}>
      {label}
    </button>
  )
}

export function Select({ value, onChange, options, labels }: { value: string; onChange: (v: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: '5px 8px', fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t1)' }}>
      {options.map((o) => <option key={o} value={o}>{labels?.[o] || o}</option>)}
    </select>
  )
}

export function Input({ value, onChange, placeholder, type }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type || 'text'}
      style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '7px 10px', fontSize: 11.5, fontFamily: 'var(--mono)', outline: 'none' }} />
  )
}

export function Tile({ label, value, color, accent }: any) {
  return (
    <div style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', letterSpacing: '.1em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 19, color: color || accent, marginTop: 6 }}>{value}</div>
    </div>
  )
}

export function Section({ title, children }: any) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t3)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

export function TextBlock({ text }: { text: string }) {
  return <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{text}</div>
}
