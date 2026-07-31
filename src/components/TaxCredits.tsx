// ============================================================
// TAX CREDITS — the cited, plain-language credit/deduction finder.
// Every figure here traces back to a named IRC section/Pub/state statute
// (src/tax-rules/* in elle-worker) — never something the LLM invented. A
// persistent disclaimer banner stays visible at the top of the tab, not
// just folded into the text, since this is the one tab most likely to be
// mistaken for filed tax advice.
// ============================================================
import { useEffect, useState } from 'react'
import { taxApi, Section, Empty, Pad, TextBlock } from './TaxPanel'

export default function TaxCredits({ businessId, taxYear }: { accent: string; businessId: string; taxYear: number }) {
  const [text, setText] = useState('')
  const [note, setNote] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const d = await taxApi('credits_finder', { business_id: businessId, tax_year: taxYear })
        setText(d.text || '')
      } catch (e: any) { setNote(String(e.message || e)) }
      setLoaded(true)
    })()
  }, [businessId, taxYear])

  if (note) return <Pad><div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#D06565' }}>{note}</div></Pad>
  if (!loaded) return <Pad><Empty>finding eligible credits…</Empty></Pad>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#5980a611', border: '0.5px solid #5980a655', borderRadius: 0, padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 10.5, color: '#5980a6', lineHeight: 1.6 }}>
        Estimates only, based on the cited rules as of the date noted per item — this supplements but does not replace a CPA. Verify before filing.
      </div>
      <Section title={`${taxYear} eligible credits & deductions`}>
        {text ? <TextBlock text={text} /> : <Empty>fill in more of onboarding's fact groups for a fuller picture</Empty>}
      </Section>
    </div>
  )
}
