import { useEffect, useRef } from 'react'
import { OUTCOME_LABEL } from '../api'

// A real phone call through Twilio. The customer talks on their phone; this panel just follows
// the call state the console WebSocket already streams, and can hang up.
export default function PhoneCallPanel({ call, lead, onHangUp, onClose }) {
  const endRef = useRef(null)
  const transcript = call?.transcript || []
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [transcript.length])

  const phase = call?.phase || 'init'
  const ended = phase === 'ended'
  const lastStatus = [...(call?.events || [])].reverse().find((e) => e.kind === 'phone_status')?.detail
  const inbound = call?.direction === 'inbound'
  const label = ended ? OUTCOME_LABEL[call.outcome] || call.outcome
    : phase === 'init' ? (lastStatus === 'ringing' ? 'Ringing…' : 'Dialling…')
    : phase === 'handoff_pending' ? 'Transferring…'
    : phase === 'human' ? 'With a human agent' : '● Live'
  const tone = ended ? 'grey' : phase === 'handoff_pending' ? 'amber' : phase === 'init' ? 'blue' : 'green'

  return (
    <div className="panel phone">
      <div className="panel-head">
        <div>
          <div className="eyebrow">{inbound ? 'Incoming phone call' : 'Phone call'} · {lead?.mobile}</div>
          <h2>{lead?.first_name || 'New caller'} · lead {lead?.id}</h2>
        </div>
        <span className={`pill ${tone}`}>{label}</span>
      </div>

      <div className="chat">
        {transcript.length === 0 && <p className="hint">{inbound ? 'Connecting the caller…' : 'Waiting for the customer to answer…'}</p>}
        {transcript.map((m, i) => (
          <div key={i} className={`bubble ${m.speaker}`}>
            <span className="who">{m.speaker === 'ai' ? 'Ava (AI)' : m.speaker === 'human' ? 'Human agent' : 'Customer (phone)'}</span>
            {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="type-row">
        {ended
          ? <button onClick={onClose}>Close call</button>
          : <button type="button" className="danger" onClick={onHangUp}>Hang up</button>}
      </div>
      {!ended && <p className="hint">The customer hears Ava on their phone. After a handoff, replies you type in the console are spoken to them.</p>}
    </div>
  )
}
