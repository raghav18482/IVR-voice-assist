import { useState } from 'react'
import { fmtSecs, OUTCOME_LABEL } from '../api'

const SIGNAL_LABEL = {
  asks: 'Asked for a person', anger: 'Frustration', confusion: 'Repeated capture failures',
  off_script: 'Off-script / advice', sensitive: 'Sensitive (payment, vulnerable, eligibility)',
  low_conf: 'Low confidence', soft: 'Accumulated signals',
}

// What the human agent sees: live fields, escalation meter, and the warm-handoff card.
export default function AgentConsole({ call, send, agentName, setAgentName }) {
  const [reply, setReply] = useState('')
  const [edit, setEdit] = useState({})
  if (!call) {
    return (
      <div className="panel console empty">
        <div className="eyebrow">Agent console</div>
        <p>Start a call from the leads list. Everything the AI hears and captures appears here live.</p>
      </div>
    )
  }
  const card = call.card
  const pending = call.phase === 'handoff_pending'
  const human = call.phase === 'human'
  const score = call.escalation?.score ?? 0
  const pct = Math.min(100, (score / 4) * 100)
  const lastEvents = [...(call.events || [])].reverse().slice(0, 12)

  return (
    <div className="panel console">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Agent console · call {call.id}</div>
          <h2>{call.lead.first_name} · {call.lead.mobile}</h2>
        </div>
        <span className={`pill ${call.phase === 'ended' ? 'grey' : pending ? 'red pulse' : human ? 'blue' : 'green'}`}>
          {call.phase === 'ended' ? OUTCOME_LABEL[call.outcome] || call.outcome : pending ? 'Handoff waiting' : human ? `With ${call.human_agent}` : `AI · ${call.phase}`}
        </span>
      </div>

      {(pending || human || call.handoff) && (
        <div className={`handoff-card ${pending ? 'alert' : ''}`}>
          <div className="hc-top">
            <strong>{pending ? 'Warm handoff requested' : 'Handoff context'}</strong>
            <span className="pill red">{SIGNAL_LABEL[card.signal] || card.signal}</span>
          </div>
          <p className="reason">{card.reason}</p>
          {card.quote && <blockquote>“{card.quote}”</blockquote>}
          <div className="hc-grid">
            <div><span className="k">Current step</span>{card.current_step}</div>
            <div><span className="k">Consent</span>{card.consent ? 'Recording consent given' : 'Not given'}</div>
            <div><span className="k">Don't ask again</span>{card.do_not_ask_again.join(', ') || '–'}</div>
            <div><span className="k">Still needed</span>{card.missing.join(', ') || 'Nothing, ready to submit'}</div>
          </div>
          {pending && (
            <div className="accept-row">
              <input value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Your name" />
              <button className="primary" onClick={() => send({ type: 'accept', call_id: call.id, agent_name: agentName })}>Accept call</button>
            </div>
          )}
        </div>
      )}

      <div className="meter">
        <div className="meter-label">Escalation score <b>{score}</b> / 4</div>
        <div className="bar"><div style={{ width: `${pct}%` }} className={pct >= 75 ? 'hot' : pct >= 50 ? 'warm' : ''} /></div>
      </div>

      <h3>Captured fields</h3>
      <table className="fields">
        <thead><tr><th>Field</th><th>Value</th><th>Status</th></tr></thead>
        <tbody>
          {card.captured.map((f) => (
            <tr key={f.key} className={call.current === f.key ? 'current' : ''}>
              <td>{f.label}</td>
              <td>
                {human ? (
                  <input className="cell-edit" defaultValue={f.value}
                         onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })}
                         onBlur={() => edit[f.key] != null && send({ type: 'set_field', call_id: call.id, field: f.key, value: edit[f.key] })} />
                ) : f.value}
              </td>
              <td>
                <span className={`tag ${f.confirmed ? 'ok' : 'pending'}`}>{f.confirmed ? 'confirmed' : 'read back'}</span>
                <span className="src">{f.source}</span>
              </td>
            </tr>
          ))}
          {card.missing.filter((m) => !card.captured.some((c) => c.label === m)).map((m) => (
            <tr key={m} className="missing"><td>{m}</td><td>–</td><td><span className="tag">missing</span></td></tr>
          ))}
        </tbody>
      </table>

      {human && (
        <div className="human-tools">
          <form className="type-row" onSubmit={(e) => { e.preventDefault(); if (reply.trim()) send({ type: 'human_say', call_id: call.id, text: reply }); setReply('') }}>
            <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Say to the customer (spoken in the human voice)…" />
            <button type="submit">Say</button>
          </form>
          <div className="type-row">
            <button className="primary" onClick={() => send({ type: 'submit', call_id: call.id })}>Submit journey</button>
            <button onClick={() => send({ type: 'end', call_id: call.id })}>End call</button>
          </div>
        </div>
      )}
      {!pending && !human && call.phase !== 'ended' && (
        <div className="type-row"><button onClick={() => send({ type: 'force_handoff', call_id: call.id })}>Take over call</button></div>
      )}

      {call.submission && (
        <div className={`submission ${call.submission.result.ok ? 'ok' : 'err'}`}>
          <strong>{call.submission.result.ok ? `Journey submitted · ${call.submission.result.reference}` : 'Sandbox rejected payload'}</strong>
          {!call.submission.result.ok && <ul>{call.submission.result.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
          <details><summary>Payload sent</summary><pre>{JSON.stringify(call.submission.payload, null, 2)}</pre></details>
        </div>
      )}

      <h3>Guardrail and flow events</h3>
      <ul className="events">
        {lastEvents.map((e, i) => (
          <li key={i}><span className="t">{fmtSecs(e.t)}</span><span className={`ek ${e.kind}`}>{e.kind.replaceAll('_', ' ')}</span>{e.detail}</li>
        ))}
      </ul>
    </div>
  )
}
