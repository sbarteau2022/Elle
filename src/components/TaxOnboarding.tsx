// ============================================================
// TAX ONBOARDING — business setup + parallel fact-group cards.
//
// No generic multi-step wizard exists anywhere in this codebase (the only
// precedent, Login.tsx's forced-password-reset, is a simple two-state
// toggle, not a step machine) — and none is needed here, because the
// backend was deliberately designed for PARALLEL onboarding: each of the
// ~8 fact-groups below saves independently, in any order, any number of
// times. This file is just a business-identity form plus 8 small
// independently-saved cards, not a sequential flow.
// ============================================================
import { useEffect, useState } from 'react'
import { Btn, Select, Input, taxOnboardingApi, type Business } from './TaxPanel'

type FieldDef = { key: string; label: string; kind: 'text' | 'number' | 'checkbox' | 'select'; options?: string[] }
type GroupDef = { key: string; title: string; fields: FieldDef[] }

const GROUPS: GroupDef[] = [
  { key: 'household', title: 'filing & household', fields: [
    { key: 'filing_status', label: 'filing status', kind: 'select', options: ['single', 'mfj', 'mfs', 'hoh'] },
    { key: 'dependents_count', label: 'dependents', kind: 'number' },
    { key: 'spouse_has_income', label: 'spouse has income', kind: 'checkbox' },
  ] },
  { key: 'income', title: 'income shape', fields: [
    { key: 'w2_income_estimate', label: 'W-2 income estimate ($)', kind: 'number' },
    { key: 'prior_year_tax_liability', label: 'prior-year total tax ($)', kind: 'number' },
    { key: 'prior_year_agi', label: 'prior-year AGI ($)', kind: 'number' },
  ] },
  { key: 'retirement', title: 'retirement', fields: [
    { key: 'retirement_plan_type', label: 'plan type', kind: 'select', options: ['none', 'sep_ira', 'solo_401k', 'simple_ira'] },
    { key: 'retirement_contributions_ytd', label: 'contributions YTD ($)', kind: 'number' },
  ] },
  { key: 'health', title: 'health insurance', fields: [
    { key: 'health_insurance_type', label: 'coverage type', kind: 'select', options: ['none', 'marketplace', 'employer', 'spouse_plan'] },
    { key: 'self_employed_health_premiums_ytd', label: 'premiums YTD ($)', kind: 'number' },
  ] },
  { key: 'home_office', title: 'home office', fields: [
    { key: 'has_home_office', label: 'has a home office', kind: 'checkbox' },
    { key: 'home_office_sqft', label: 'office sqft', kind: 'number' },
    { key: 'home_total_sqft', label: 'home total sqft', kind: 'number' },
    { key: 'home_office_method', label: 'method', kind: 'select', options: ['simplified', 'actual'] },
  ] },
  { key: 'vehicle', title: 'vehicle use', fields: [
    { key: 'uses_vehicle_for_business', label: 'uses a vehicle for business', kind: 'checkbox' },
    { key: 'vehicle_business_miles_ytd', label: 'business miles YTD', kind: 'number' },
    { key: 'vehicle_method', label: 'method', kind: 'select', options: ['standard_mileage', 'actual'] },
  ] },
  { key: 'equipment', title: 'equipment', fields: [
    { key: 'equipment_purchases_ytd', label: 'equipment purchases YTD ($)', kind: 'number' },
    { key: 'section179_candidate', label: 'candidate for Section 179 expensing', kind: 'checkbox' },
  ] },
  { key: 'contractors', title: 'contractors', fields: [
    { key: 'pays_contractors', label: 'pays 1099 contractors', kind: 'checkbox' },
  ] },
]

export default function TaxOnboarding({ accent, businessId, businesses, taxYear, onBusinessCreated }: {
  accent: string; businessId: string; businesses: Business[]; taxYear: number; onBusinessCreated: (id: string) => void
}) {
  if (!businessId) return <NewBusinessForm accent={accent} onCreated={onBusinessCreated} />
  return <FactGroups accent={accent} businessId={businessId} taxYear={taxYear} businesses={businesses} />
}

function NewBusinessForm({ accent, onCreated }: { accent: string; onCreated: (id: string) => void }) {
  const [name, setName] = useState('')
  const [entityType, setEntityType] = useState('sole_prop')
  const [state, setState] = useState('MO')
  const [locality, setLocality] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const create = async () => {
    if (!name.trim()) { setNote('business name required'); return }
    setBusy(true); setNote('')
    try {
      const out = await taxOnboardingApi({ business_name: name.trim(), entity_type: entityType, state: state.trim() || undefined, locality: locality || undefined })
      onCreated(out.business.id)
    } catch (e: any) { setNote(String(e.message || e)) } finally { setBusy(false) }
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--t1)' }}>set up a business</div>
      <div style={{ fontSize: 11.5, color: 'var(--t3)', lineHeight: 1.6 }}>
        Just enough to stand it up — everything else (filing status, retirement, home office…) is filled in below, in any order, whenever you have it.
      </div>
      {note && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#D06565' }}>{note}</div>}
      <Input value={name} onChange={setName} placeholder="business name" />
      <Select value={entityType} onChange={setEntityType} options={['sole_prop', 'single_member_llc', 'multi_member_llc', 's_corp', 'c_corp']} />
      <Input value={state} onChange={setState} placeholder="state (2-letter, e.g. MO)" />
      <Select value={locality} onChange={setLocality} options={['', 'KC', 'STL']} labels={{ '': 'no local earnings tax', KC: 'Kansas City', STL: 'St. Louis' }} />
      {(entityType === 's_corp' || entityType === 'c_corp') && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', lineHeight: 1.6, borderLeft: '2px solid var(--b1)', paddingLeft: 10 }}>
          Note: {entityType === 's_corp' ? 'S-corp' : 'C-corp'} tax computation isn't built yet in this suite (v1 covers sole proprietorships and pass-through LLCs) — the business record and facts still save, just no quarterly estimate yet.
        </div>
      )}
      <button onClick={create} disabled={busy || !name.trim()}
        style={{ alignSelf: 'flex-start', padding: '6px 16px', borderRadius: 0, border: `0.5px solid ${accent}55`, background: accent + '22', color: accent, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
        {busy ? '…' : 'create ▸'}
      </button>
    </div>
  )
}

function FactGroups({ accent, businessId, taxYear, businesses }: { accent: string; businessId: string; taxYear: number; businesses: Business[] }) {
  const [completed, setCompleted] = useState<string[]>([])
  const [note, setNote] = useState('')
  const business = businesses.find((b) => b.id === businessId)

  const loadStatus = async () => {
    try {
      const d = await taxOnboardingApi({ business_id: businessId, tax_year: taxYear })
      setCompleted(d.facts_status?.completed_groups || [])
    } catch (e: any) { setNote(String(e.message || e)) }
  }
  useEffect(() => { loadStatus() }, [businessId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t1)' }}>{business?.name} onboarding</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: accent }}>{completed.length}/{GROUPS.length} groups complete</span>
        {note && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#D06565' }}>{note}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
        {GROUPS.map((g) => (
          <FactCard key={g.key} group={g} accent={accent} businessId={businessId} taxYear={taxYear}
            done={completed.includes(g.key)} onSaved={() => setCompleted((c) => (c.includes(g.key) ? c : [...c, g.key]))} />
        ))}
      </div>
    </div>
  )
}

function FactCard({ group, accent, businessId, taxYear, done, onSaved }: {
  group: GroupDef; accent: string; businessId: string; taxYear: number; done: boolean; onSaved: () => void
}) {
  const [values, setValues] = useState<Record<string, string | boolean>>({})
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const set = (k: string, v: string | boolean) => setValues((prev) => ({ ...prev, [k]: v }))

  const save = async () => {
    setBusy(true); setNote('')
    try {
      const payload: Record<string, unknown> = {}
      for (const f of group.fields) {
        const v = values[f.key]
        if (v === undefined) continue
        payload[f.key] = f.kind === 'number' ? (v === '' ? null : Number(v)) : f.kind === 'checkbox' ? !!v : v;
      }
      await taxOnboardingApi({ business_id: businessId, tax_year: taxYear, facts: { [group.key]: payload } })
      onSaved()
    } catch (e: any) { setNote(String(e.message || e)) } finally { setBusy(false) }
  }

  return (
    <div style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 0, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--t1)', fontWeight: 500 }}>{group.title}</span>
        {done && <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 9.5, color: '#4ADE80' }}>✓ saved</span>}
      </div>
      {group.fields.map((f) => (
        <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', flex: 1 }}>{f.label}</span>
          {f.kind === 'checkbox' && (
            <input type="checkbox" checked={!!values[f.key]} onChange={(e) => set(f.key, e.target.checked)} />
          )}
          {f.kind === 'select' && (
            <Select value={String(values[f.key] ?? f.options![0])} onChange={(v) => set(f.key, v)} options={f.options!} />
          )}
          {(f.kind === 'text' || f.kind === 'number') && (
            <input value={String(values[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)} type={f.kind === 'number' ? 'number' : 'text'}
              style={{ width: 100, background: 'var(--base)', border: '0.5px solid var(--b1)', borderRadius: 0, color: 'var(--t1)', padding: '4px 7px', fontSize: 10.5, fontFamily: 'var(--mono)', outline: 'none' }} />
          )}
        </div>
      ))}
      {note && <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: '#D06565' }}>{note}</div>}
      <Btn label={busy ? '…' : 'save'} color={accent} onClick={save} disabled={busy} />
    </div>
  )
}
