import { useCallback, useEffect, useRef, useState } from 'react'
import { api, wsUrl } from './api'
import LeadsPanel from './components/LeadsPanel'
import CustomerPhone from './components/CustomerPhone'
import PhoneCallPanel from './components/PhoneCallPanel'
import AgentConsole from './components/AgentConsole'
import MetricsPage from './components/MetricsPage'
import InsightsPage from './components/InsightsPage'
import ScriptPage from './components/ScriptPage'

const TABS = [
  ['call', 'Live call'],
  ['metrics', 'Metrics & harness'],
  ['insights', 'Transcript insights'],
  ['script', 'Script'],
]

export default function App() {
  const [tab, setTab] = useState('call')
  const [leads, setLeads] = useState([])
  const [health, setHealth] = useState(null)
  const [active, setActive] = useState(null) // { callId, lead, mode: 'browser' | 'phone' }
  const [calls, setCalls] = useState({})
  const [focus, setFocus] = useState(null)
  const [agentName, setAgentName] = useState('Aarav')
  const [error, setError] = useState(null)
  const consoleWs = useRef(null)
  const seenCalls = useRef(new Set())

  const loadLeads = useCallback(() => api('/api/leads').then(setLeads).catch(() => {}), [])

  useEffect(() => {
    loadLeads()
    api('/api/health').then(setHealth).catch(() => setHealth({ ok: false }))
    let stop = false
    const connect = () => {
      const ws = new WebSocket(wsUrl('/ws/console'))
      consoleWs.current = ws
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data)
        if (m.type === 'snapshot') {
          m.calls.forEach((c) => seenCalls.current.add(c.id))
          setCalls(Object.fromEntries(m.calls.map((c) => [c.id, c])))
        }
        if (m.type === 'call_update') {
          const c = m.call
          setCalls((cs) => ({ ...cs, [c.id]: c }))
          // Someone rang the Twilio number: bring their call up on screen.
          if (!seenCalls.current.has(c.id) && c.direction === 'inbound' && c.phase !== 'ended') {
            setActive({ callId: c.id, lead: c.lead, mode: 'phone' })
            setFocus(c.id)
          }
          seenCalls.current.add(c.id)
        }
      }
      ws.onclose = () => { if (!stop) setTimeout(connect, 1500) }
    }
    connect()
    return () => { stop = true; consoleWs.current?.close() }
  }, [loadLeads])

  const sendConsole = (msg) => consoleWs.current?.readyState === 1 && consoleWs.current.send(JSON.stringify(msg))

  const startCall = async (lead, mode = 'browser') => {
    setError(null)
    try {
      const r = await api('/api/calls', { method: 'POST', body: { lead_id: lead.id, mode } })
      seenCalls.current.add(r.call_id)
      setActive({ callId: r.call_id, lead, mode })
      setFocus(r.call_id)
    } catch (e) {
      setError(e.message)
      loadLeads()
    }
  }

  const pendingOthers = Object.values(calls).filter((c) => c.phase === 'handoff_pending' && c.id !== focus)
  const consoleCall = calls[focus] || null

  return (
    <div className="app">
      <header>
        <div className="brand">
          <span className="logo">econnex</span>
          <span className="title">Energy recovery voice agent</span>
        </div>
        <nav>{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</nav>
        <div className="health">
          <span className={`dot ${health?.ok ? 'g' : 'r'}`} />
          {health?.ok ? `Backend ok · understanding: ${health.llm} · sandbox: ${health.sandbox}` : 'Backend offline, start uvicorn'}
          {health?.telephony && ` · phone: ${health.phone_number}`}
        </div>
      </header>

      {error && <div className="banner">{error}</div>}
      {pendingOthers.length > 0 && (
        <div className="banner amber">
          Handoff waiting: {pendingOthers.map((c) => <button key={c.id} onClick={() => setFocus(c.id)}>{c.lead.first_name || c.lead.mobile} ({c.card.reason})</button>)}
        </div>
      )}

      {tab === 'call' && (
        <main className="grid">
          <LeadsPanel leads={leads} onCall={startCall} phoneEnabled={!!health?.telephony} activeLead={active?.lead?.id} refresh={loadLeads} />
          {active?.mode === 'phone' ? (
            <PhoneCallPanel key={active.callId} call={calls[active.callId]} lead={calls[active.callId]?.lead || active.lead}
                            onHangUp={() => sendConsole({ type: 'end', call_id: active.callId, line: 'Thanks for your time, goodbye.' })}
                            onClose={() => { setActive(null); loadLeads() }} />
          ) : active ? (
            <CustomerPhone key={active.callId} callId={active.callId} lead={active.lead} onClose={() => { setActive(null); loadLeads() }} />
          ) : (
            <div className="panel phone empty">
              <div className="eyebrow">Customer phone</div>
              <h2>No active call</h2>
              <p>Pick a lead and press <b>Call</b>. You play the customer, by voice in Chrome or by typing. The agent speaks through your speakers.</p>
              <p className="hint">Try saying: "I've already told three of you my details", "can I pay by card?", "which plan is best for me?", or "talk to a real person".</p>
            </div>
          )}
          <AgentConsole call={consoleCall} send={sendConsole} agentName={agentName} setAgentName={setAgentName} />
        </main>
      )}
      {tab === 'metrics' && <MetricsPage />}
      {tab === 'insights' && <InsightsPage />}
      {tab === 'script' && <ScriptPage />}
    </div>
  )
}
