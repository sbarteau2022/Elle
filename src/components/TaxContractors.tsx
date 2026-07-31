// ============================================================
// TAX CONTRACTORS — 1099 tracking. List + add-form.
// ============================================================
import { useEffect, useState } from 'react'
import { taxApi, Section, Empty, Input, TextBlock } from './TaxPanel'

export default function TaxContractors({ accent, businessId, taxYear }: { accent: string; businessId: string; taxYear: number }) {
  const [listText, setListText] = useState('')
  const [name, setName] = useState('')
  const [w9OnFile, setW9OnFile] = useState(false)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const load = async () => {
    try {
      const d = await taxApi('contractor_list', { business_id: businessId, tax_year: taxYear })
      setListText(d.text || '')
    } catch (e: any) { setNote(String(e.message || e)) }
  }
  useEffect(() => { load() }, [businessId]) // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    if (!name.trim()) { setNote('contractor name required'); return }
    setBusy(true); setNote('')
    try {
      await taxApi('contractor_add', { business_id: businessId, tax_year: taxYear, contractor_name: name.trim(), w9_on_file: w9OnFile, notes: notes || undefined })
      setName(''); setNotes(''); setW9OnFile(false)
      await load()
    } catch (e: any) { setNote(String(e.message || e)) } finally { setBusy(false) }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Section title="add / update a contractor">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input value={name} onChange={setName} placeholder="contractor name" />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t3)' }}>
            <input type="checkbox" checked={w9OnFile} onChange={(e) => setW9OnFile(e.target.checked)} /> W-9 on file
          </label>
          <Input value={notes} onChange={setNotes} placeholder="notes (optional)" />
          <button onClick={add} disabled={busy}
            style={{ padding: '6px 14px', borderRadius: 0, border: `0.5px solid ${accent}55`, background: accent + '22', color: accent, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
            {busy ? '…' : 'save ▸'}
          </button>
        </div>
        {note && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#D06565', marginTop: 8 }}>{note}</div>}
      </Section>

      <Section title={`${taxYear} contractors — payments and 1099-NEC threshold`}>
        {listText ? <TextBlock text={listText} /> : <Empty>no contractors on file</Empty>}
      </Section>
    </div>
  )
}
