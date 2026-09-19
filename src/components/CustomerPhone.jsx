import { useEffect, useRef, useState } from 'react'
import { wsUrl, OUTCOME_LABEL } from '../api'
import { useSpeech } from '../useSpeech'

// The customer's side of the call: talks to the agent through the mic, or by typing.
export default function CustomerPhone({ callId, lead, onClose }) {
  const [msgs, setMsgs] = useState([])
  const [status, setStatus] = useState('connecting')
  const [text, setText] = useState('')
  const [bargeIn, setBargeIn] = useState(false)
  const [micOn, setMicOn] = useState(true)
  const wsRef = useRef(null)
  const endRef = useRef(null)

  const send = (t, confidence = null) => {
    if (!t.trim() || wsRef.current?.readyState !== 1) return
    setMsgs((m) => [...m, { speaker: 'customer', text: t, confidence }])
    wsRef.current.send(JSON.stringify({ type: 'utterance', text: t, confidence }))
  }

  const speech = useSpeech({ onFinal: (t, c) => send(t, c), bargeIn })
  const speechRef = useRef(speech)
  speechRef.current = speech // WebSocket handlers always use the latest toggles (mute, interruptions)

  useEffect(() => {
    if (!callId) return
    const ws = new WebSocket(wsUrl(`/ws/call/${callId}`))
    wsRef.current = ws
    ws.onopen = () => {
      setStatus('live')
      if (micOn) speechRef.current.listen(true)
    }
    ws.onmessage = (e) => {
      const ev = JSON.parse(e.data)
      if (ev.type === 'say') {
        setMsgs((m) => [...m, { speaker: ev.speaker, text: ev.text }])
        if (ev.speaker === 'human') setStatus('human')
        speechRef.current.speak(ev.text, ev.speaker)
      } else if (ev.type === 'handoff') {
        setStatus('transferring')
      } else if (ev.type === 'ended') {
        setStatus(`ended:${ev.outcome}`)
        speechRef.current.listen(false)
      }
    }
    ws.onclose = () => setStatus((s) => (s.startsWith('ended') ? s : 'ended:disconnected'))
    return () => {
      speechRef.current.stopAll()
      ws.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, speech.interim])

  useEffect(() => {
    if (['live', 'transferring', 'human'].includes(status)) speech.listen(micOn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micOn])

  const hangup = () => {
    wsRef.current?.send(JSON.stringify({ type: 'hangup' }))
    speech.stopAll()
    setStatus('ended:customer_hung_up')
  }

  const ended = status.startsWith('ended')
  const outcome = ended ? status.split(':')[1] : null

  return (
    <div className="panel phone">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Customer phone</div>
          <h2>{lead?.first_name} · lead {lead?.id}</h2>
        </div>
        <span className={`pill ${ended ? 'grey' : status === 'transferring' ? 'amber' : 'green'}`}>
          {ended ? OUTCOME_LABEL[outcome] || outcome : status === 'transferring' ? 'Transferring…' : status === 'human' ? 'With a human agent' : status === 'live' ? '● Live' : 'Connecting'}
        </span>
      </div>

      <div className="chat">
        {msgs.map((m, i) => (
          <div key={i} className={`bubble ${m.speaker}`}>
            <span className="who">{m.speaker === 'ai' ? 'Ava (AI)' : m.speaker === 'human' ? 'Human agent' : 'You'}</span>
            {m.text}
            {m.confidence != null && m.speaker === 'customer' && <span className="conf">asr {Math.round(m.confidence * 100)}%</span>}
          </div>
        ))}
        {speech.interim && <div className="bubble customer interim">{speech.interim}…</div>}
        <div ref={endRef} />
      </div>

      {!ended ? (
        <>
          <div className="voice-row">
            <button className={`mic ${speech.listening ? 'on' : ''}`} onClick={() => setMicOn((v) => !v)}
                    disabled={!speech.supported.stt} title={speech.supported.stt ? '' : 'Use Chrome for voice'}>
              {micOn ? (speech.listening ? '🎙 Listening' : speech.speaking ? '🔊 Agent speaking' : '🎙 Mic on') : '🎙 Mic off'}
            </button>
            <label className="toggle"><input type="checkbox" checked={bargeIn} onChange={(e) => setBargeIn(e.target.checked)} /> Allow interruptions (headphones)</label>
            <label className="toggle"><input type="checkbox" checked={speech.muted} onChange={(e) => speech.setMuted(e.target.checked)} /> Mute agent voice</label>
          </div>
          <form className="type-row" onSubmit={(e) => { e.preventDefault(); send(text, 0.95); setText('') }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Or type what the customer says…" />
            <button type="submit">Send</button>
            <button type="button" className="danger" onClick={hangup}>Hang up</button>
          </form>
          {!speech.supported.stt && <p className="hint">Voice input needs Chrome. Typing works everywhere.</p>}
        </>
      ) : (
        <div className="type-row"><button onClick={onClose}>Close call</button></div>
      )}
    </div>
  )
}
