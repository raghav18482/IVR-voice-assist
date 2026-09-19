import { useEffect, useState } from 'react'
import { api, fmtSecs, OUTCOME_LABEL } from '../api'

export default function MetricsPage() {
  const [m, setM] = useState(null)
  const [sim, setSim] = useState(null)
  const [running, setRunning] = useState(false)
  const load = () => api('/api/metrics').then(setM)
  useEffect(() => { load() }, [])
  const runSim = async () => {
    setRunning(true)
    try { setSim(await api('/api/simulate', { method: 'POST' })) } finally { setRunning(false) }
  }
  return (
    <div className="page">
      <section className="panel">
        <div className="panel-head">
          <div><div className="eyebrow">Efficiency vs the manual workflow</div><h2>Live call metrics</h2></div>
          <button className="ghost" onClick={load}>Refresh</button>
        </div>
        {m && (
          <>
            <div className="tiles">
              <Tile label="Calls" value={m.calls} />
              <Tile label="Submitted with no human" value={m.submitted_without_human} />
              <Tile label="Avg AI call" value={m.avg_ai_call_minutes != null ? `${m.avg_ai_call_minutes} min` : '–'} />
              <Tile label="Manual baseline (sample call)" value={`${m.manual_baseline_minutes} min`} />
              <Tile label="Human agent minutes saved" value={m.human_minutes_saved} />
              <Tile label="Avg re-asks per call" value={m.avg_reasks ?? '–'} />
            </div>
            <div className="two-col">
              <div>
                <h3>Outcomes</h3>
                <ul className="kv">{Object.entries(m.outcomes).map(([k, v]) => <li key={k}><span>{OUTCOME_LABEL[k] || k}</span><b>{v}</b></li>)}</ul>
              </div>
              <div>
                <h3>Handoff reasons</h3>
                <ul className="kv">{Object.entries(m.handoff_reasons).map(([k, v]) => <li key={k}><span>{k}</span><b>{v}</b></li>)}</ul>
              </div>
            </div>
            <h3>Recent calls</h3>
            <table className="fields">
              <thead><tr><th>Call</th><th>Customer</th><th>Outcome</th><th>Duration</th><th>Re-asks</th><th>Handoff</th></tr></thead>
              <tbody>{m.recent.map((r) => (
                <tr key={r.id}><td>{r.id}</td><td>{r.name} #{r.lead}</td><td>{OUTCOME_LABEL[r.outcome] || r.outcome}</td>
                  <td>{fmtSecs(r.duration_s)}</td><td>{r.reasks}</td><td>{r.handoff || '–'}</td></tr>))}</tbody>
            </table>
            <p className="hint">The manual baseline is estimated talk time from CIMET's sample call (words ÷ 150 wpm). The real call ran longer, since it also had holds and web-form steps.</p>
          </>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div><div className="eyebrow">Robustness evidence</div><h2>Persona harness</h2></div>
          <button className="primary" onClick={runSim} disabled={running}>{running ? 'Running…' : 'Run all personas'}</button>
        </div>
        <p className="muted">Scripted customers run through the real engine: cooperative, busy, angry, confused, asks for advice, wants to pay by card, refuses recording, embedded network, WA, and more.</p>
        {sim && (
          <>
            <div className="tiles"><Tile label="Behaved as expected" value={`${sim.passed} / ${sim.total}`} /></div>
            <table className="fields">
              <thead><tr><th></th><th>Persona</th><th>Expected</th><th>Actual</th><th>Turns</th><th>Re-asks</th><th>Fields by AI</th></tr></thead>
              <tbody>{sim.results.map((r) => (
                <tr key={r.persona}><td>{r.pass ? '✓' : '✕'}</td><td>{r.persona}</td><td>{r.expected}</td><td>{r.actual}</td>
                  <td>{r.turns}</td><td>{r.reasks}</td><td>{r.fields_by_ai}</td></tr>))}</tbody>
            </table>
            <h3>Pre-dial gate</h3>
            <ul className="kv">{sim.gate.map((g) => <li key={g.lead}><span>Lead {g.lead}</span><b>{g.allowed ? 'allowed' : `blocked: ${g.failed.join(', ')}`}</b></li>)}</ul>
          </>
        )}
      </section>
    </div>
  )
}

function Tile({ label, value }) {
  return <div className="tile"><div className="tile-v">{value}</div><div className="tile-l">{label}</div></div>
}
