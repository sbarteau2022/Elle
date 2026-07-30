// ============================================================
// TAX DASHBOARD — the at-a-glance view: YTD P&L, next deadline, the
// current quarter's deterministic estimate, and a credits teaser.
// Stat-tile layout, mirroring TradingPanel.tsx's convention.
// ============================================================
import { useEffect, useState } from 'react'
import { taxApi, Tile, Section, Empty, Pad, TextBlock } from './TaxPanel'

export default function TaxDashboard({ accent, businessId, taxYear }: { accent: string; businessId: string; taxYear: number }) {
  const [report, setReport] = useState<{ text?: string } | null>(null)
  const [deadline, setDeadline] = useState<{ quarter: number; date: string; days_remaining: number } | null>(null)
  const [estimate, setEstimate] = useState<{ text?: string } | null>(null)
  const [credits, setCredits] = useState<{ text?: string } | null>(null)
  const [note, setNote] = useState('')

  const load = async () => {
    try {
      const [r, d, e, c] = await Promise.all([
        taxApi('report', { business_id: businessId, tax_year: taxYear }),
        taxApi('deadline_next', { business_id: businessId }),
        taxApi('estimate_quarterly', { business_id: businessId, tax_year: taxYear }),
        taxApi('credits_finder', { business_id: businessId, tax_year: taxYear }),
      ])
      setReport(r); setDeadline(d); setEstimate(e); setCredits(c)
    } catch (err: any) { setNote(String(err.message || err)) }
  }
  useEffect(() => { load() }, [businessId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (note) return <Pad><div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#D06565' }}>{note}</div></Pad>
  if (!report) return <Pad><Empty>loading…</Empty></Pad>

  const netLine = report.text?.split('\n').find((l) => l.startsWith('Net profit:'))
  const grossLine = report.text?.split('\n').find((l) => l.startsWith('Gross receipts:'))
  const expenseLine = report.text?.split('\n').find((l) => l.startsWith('Total expenses:'))

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
        <Tile label="gross receipts" value={grossLine?.split(': ')[1] || '—'} accent={accent} />
        <Tile label="total expenses" value={expenseLine?.split(': ')[1] || '—'} accent={accent} />
        <Tile label="net profit" value={netLine?.split(': ')[1] || '—'} accent={accent} />
        <Tile label="next deadline"
          value={deadline ? `Q${deadline.quarter} · ${deadline.days_remaining}d` : '—'}
          color={deadline && deadline.days_remaining <= 14 ? '#D06565' : undefined} accent={accent} />
      </div>

      <Section title="quarterly estimate">
        {estimate?.text ? <TextBlock text={estimate.text} /> : <Empty>no estimate available</Empty>}
      </Section>

      <Section title="credits & deductions (top of list)">
        {credits?.text ? <TextBlock text={credits.text.split('\n').slice(0, 8).join('\n')} /> : <Empty>nothing found yet</Empty>}
      </Section>
    </div>
  )
}
