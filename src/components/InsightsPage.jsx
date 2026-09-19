import { useEffect, useState } from 'react'
import { api } from '../api'

// Uses CIMET's real call transcript as input: stage timeline, compliance findings, manual baseline.
export default function InsightsPage() {
  const [r, setR] = useState(null)
  const [custom, setCustom] = useState('')
  const [showAll, setShowAll] = useState(false)
  useEffect(() => { api('/api/insights').then(setR) }, [])
  const analyse = async () => setR(await api('/api/insights', { method: 'POST', body: { text: custom } }))
  if (!r) return <div className="page"><div className="panel">Loading…</div></div>
  if (r.error) return <div className="page"><div className="panel">{r.error}</div></div>
  const tl = showAll ? r.timeline : r.timeline.slice(0, 24)
  return (
    <div className="page">
      <section className="panel">
        <div className="eyebrow">Input: CIMET's redacted sales call transcript</div>
        <h2>What the manual call teaches us</h2>
        <div className="tiles">
          <div className="tile"><div className="tile-v">{r.turns}</div><div className="tile-l">Speaker turns</div></div>
          <div className="tile"><div className="tile-v">{r.est_minutes} min</div><div className="tile-l">Estimated talk time</div></div>
          <div className="tile"><div className="tile-v">{r.agent_words}</div><div className="tile-l">Words spoken by agent</div></div>
          <div className="tile"><div className="tile-v">{r.web_form_instructions}</div><div className="tile-l">Web-form instructions</div></div>
          <div className="tile"><div className="tile-v">{r.reasks}</div><div className="tile-l">Mishears / re-asks</div></div>
        </div>
        <p className="hint">{r.note}</p>
      </section>

      <section className="panel">
        <h2>Compliance findings and how our agent fixes each</h2>
        {r.findings.map((f) => (
          <div key={f.title} className={`finding ${f.severity}`}>
            <div className="f-top"><span className={`sev ${f.severity}`}>{f.severity}</span><b>{f.title}</b></div>
            <p>{f.detail}</p>
            {f.evidence && <blockquote>“{f.evidence}…”</blockquote>}
            <p className="fix">Our agent: {f.fix}</p>
          </div>
        ))}
      </section>

      <section className="panel">
        <h2>Call stages (agent turns)</h2>
        <ul className="timeline">
          {tl.map((t) => (
            <li key={t.i} className={t.role}>
              <span className="t">{t.minute}m</span>
              {t.stage && <span className={`stage ${t.stage}`}>{t.stage}</span>}
              <span className="txt">{t.text.slice(0, 180)}{t.text.length > 180 ? '…' : ''}</span>
            </li>
          ))}
        </ul>
        <button className="ghost" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Show less' : `Show all ${r.timeline.length} turns`}</button>
      </section>

      <section className="panel">
        <h2>Analyse another transcript</h2>
        <p className="muted">Paste lines like "Speaker 1: …" or "Agent: …".</p>
        <textarea rows={6} value={custom} onChange={(e) => setCustom(e.target.value)} />
        <div className="type-row"><button className="primary" onClick={analyse} disabled={!custom.trim()}>Analyse</button>
          <button className="ghost" onClick={() => api('/api/insights').then(setR)}>Back to sample</button></div>
      </section>
    </div>
  )
}
