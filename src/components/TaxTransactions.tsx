// ============================================================
// TAX TRANSACTIONS — income/expense ledger. List + add-form, mirroring
// ConductorPanel.tsx's list+create-form convention.
// ============================================================
import { useEffect, useState } from 'react'
import { taxApi, Section, Empty, Input, Select, TextBlock } from './TaxPanel'

const CATEGORIES = [
  'income_gross_receipts', 'supplies', 'advertising', 'contract_labor', 'home_office',
  'vehicle', 'insurance', 'equipment', 'travel', 'meals', 'utilities', 'rent', 'other',
]

export default function TaxTransactions({ accent, businessId, taxYear }: { accent: string; businessId: string; taxYear: number }) {
  const [listText, setListText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [direction, setDirection] = useState('expense')
  const [category, setCategory] = useState('supplies')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [occurredAt, setOccurredAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const load = async () => {
    try {
      const d = await taxApi('transaction_list', { business_id: businessId, tax_year: taxYear, category: categoryFilter || undefined })
      setListText(d.text || '')
    } catch (e: any) { setNote(String(e.message || e)) }
  }
  useEffect(() => { load() }, [businessId, categoryFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    if (!amount || Number(amount) <= 0) { setNote('amount must be a positive number'); return }
    setBusy(true); setNote('')
    try {
      await taxApi('transaction_add', {
        business_id: businessId, tax_year: taxYear, direction, category, amount: Number(amount),
        description: description || undefined, occurred_at: occurredAt || undefined,
      })
      setAmount(''); setDescription(''); setOccurredAt('')
      await load()
    } catch (e: any) { setNote(String(e.message || e)) } finally { setBusy(false) }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Section title="add a transaction">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Select value={direction} onChange={setDirection} options={['income', 'expense']} />
          <Select value={category} onChange={setCategory} options={CATEGORIES} />
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="amount ($)" type="number"
            style={{ width: 110, background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '7px 10px', fontSize: 11.5, fontFamily: 'var(--mono)', outline: 'none' }} />
          <input value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} type="date"
            style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '7px 10px', fontSize: 11.5, fontFamily: 'var(--mono)', outline: 'none' }} />
          <Input value={description} onChange={setDescription} placeholder="description (optional)" />
          <button onClick={add} disabled={busy}
            style={{ padding: '6px 14px', borderRadius: 6, border: `0.5px solid ${accent}55`, background: accent + '22', color: accent, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
            {busy ? '…' : 'add ▸'}
          </button>
        </div>
        {note && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#D06565', marginTop: 8 }}>{note}</div>}
      </Section>

      <Section title={`${taxYear} transactions`}>
        <div style={{ marginBottom: 10 }}>
          <Select value={categoryFilter} onChange={setCategoryFilter} options={['', ...CATEGORIES]} labels={{ '': 'all categories' }} />
        </div>
        {listText ? <TextBlock text={listText} /> : <Empty>no transactions yet</Empty>}
      </Section>
    </div>
  )
}
