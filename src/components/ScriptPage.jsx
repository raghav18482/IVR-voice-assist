import { useEffect, useState } from 'react'
import { api } from '../api'

// The drafted Energy script: the source of truth for what the agent asks and captures.
export default function ScriptPage() {
  const [s, setS] = useState(null)
  useEffect(() => { api('/api/script').then(setS) }, [])
  if (!s) return <div className="page"><div className="panel">Loading…</div></div>
  return (
    <div className="page">
      <section className="panel">
        <div className="eyebrow">backend/app/scripts/energy.yaml · {s.version}</div>
        <h2>Energy recovery script</h2>
        <p className="muted">Edit the YAML and restart the backend. The engine asks the fields in this order, validates each one, and reads back the critical ones.</p>
        <h3>Compliance lines (spoken verbatim)</h3>
        <ul className="kv lines">
          <li><span>Recording disclosure</span><b>{s.lines.consent}</b></li>
          <li><span>Explicit informed consent</span><b>{s.lines.eic}</b></li>
          <li><span>Payment boundary</span><b>{s.lines.payment_boundary}</b></li>
          <li><span>No advice</span><b>{s.lines.no_advice}</b></li>
          <li><span>Warm handoff</span><b>{s.lines.handoff}</b></li>
        </ul>
      </section>
      {s.sections.map((sec) => (
        <section className="panel" key={sec.id}>
          <h2>{sec.title}</h2>
          {sec.intro && <p className="muted">“{sec.intro}”</p>}
          {sec.type === 'plan' && <p>Reads the three lowest-priced plans for the customer's fuel and state from the plan catalogue, with facts only (rates, % below the reference price). No recommendation.</p>}
          {sec.type === 'eic' && <p>Reads the explicit informed consent verbatim. A clear yes submits the journey payload.</p>}
          {sec.fields?.length > 0 && sec.type !== 'plan' && (
            <table className="fields">
              <thead><tr><th>Field</th><th>Type</th><th>Agent says</th><th>Rules</th></tr></thead>
              <tbody>{sec.fields.map((f) => (
                <tr key={f.key}><td>{f.label}</td><td>{f.type}</td><td>{f.ask}</td>
                  <td>{[f.critical && 'read back', f.optional && 'optional', f.condition && `only if ${f.condition.field}=${f.condition.equals}`,
                    f.on_value && Object.entries(f.on_value).map(([v, a]) => `${v} → ${a.action}`).join(', '), f.flag_if && `flag if ${f.flag_if}`].filter(Boolean).join(' · ')}</td></tr>
              ))}</tbody>
            </table>
          )}
        </section>
      ))}
    </div>
  )
}
