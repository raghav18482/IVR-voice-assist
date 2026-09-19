import { useState } from 'react'

// Dropped-off Energy leads. Every dial passes the pre-dial compliance gate first.
export default function LeadsPanel({ leads, onCall, activeLead, refresh }) {
  const [open, setOpen] = useState(null)
  return (
    <div className="panel leads">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Dropped-off Energy leads</div>
          <h2>Recovery queue</h2>
        </div>
        <button className="ghost" onClick={refresh}>Refresh</button>
      </div>
      {leads.map((l) => {
        const allowed = l.gate?.allowed
        const warn = l.gate?.checks?.some((c) => c.warn)
        return (
          <div key={l.id} className={`lead ${activeLead === l.id ? 'active' : ''}`}>
            <div className="lead-top">
              <div>
                <b>{l.first_name}</b> <span className="muted">#{l.id}</span>
                <div className="muted small">Stopped at: {l.last_completed_step} · {l.source}</div>
              </div>
              <button className={allowed ? 'primary' : 'blocked'} disabled={!allowed} onClick={() => onCall(l)}>
                {allowed ? 'Call' : 'Blocked'}
              </button>
            </div>
            <button className="linkish" onClick={() => setOpen(open === l.id ? null : l.id)}>
              {allowed ? (warn ? 'Gate passed, with a warning' : 'Gate passed') : 'Why blocked?'} {open === l.id ? '▴' : '▾'}
            </button>
            {open === l.id && (
              <ul className="gate">
                {l.gate.checks.map((c) => (
                  <li key={c.check} className={c.ok ? (c.warn ? 'warn' : 'ok') : 'bad'}>
                    <span>{c.ok ? (c.warn ? '!' : '✓') : '✕'}</span> {c.check}: <span className="muted">{c.detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
