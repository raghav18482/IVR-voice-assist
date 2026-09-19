import { useCallback, useEffect, useRef, useState } from 'react'

// Browser voice I/O: Chrome's Web Speech API for recognition, speechSynthesis for the agent's voice.
// No API keys needed. Works best in Chrome with headphones.
const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

function pickVoice(kind) {
  const voices = window.speechSynthesis?.getVoices?.() || []
  const au = voices.filter((v) => v.lang?.toLowerCase().startsWith('en-au'))
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'))
  const pool = au.length ? au : en
  if (kind === 'human') return pool[1] || pool[0] || en[1] || en[0]
  return pool.find((v) => /female|karen|catherine|natasha|samantha|google/i.test(v.name)) || pool[0] || en[0]
}

export function useSpeech({ onFinal, bargeIn }) {
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [muted, setMuted] = useState(false)
  const recRef = useRef(null)
  const wantListen = useRef(false)
  const queue = useRef(0)
  const onFinalRef = useRef(onFinal)
  onFinalRef.current = onFinal
  const supported = { stt: !!SR, tts: typeof window !== 'undefined' && 'speechSynthesis' in window }

  useEffect(() => {
    window.speechSynthesis?.getVoices?.()
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
    return () => stopAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startRec = useCallback(() => {
    if (!SR || recRef.current) return
    const rec = new SR()
    rec.lang = 'en-AU'
    rec.interimResults = true
    rec.continuous = false
    rec.maxAlternatives = 1
    rec.onresult = (e) => {
      let text = ''
      let final = null
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) final = { text: r[0].transcript, confidence: r[0].confidence }
        else text += r[0].transcript
      }
      if (text && window.speechSynthesis.speaking && bargeIn) {
        window.speechSynthesis.cancel() // barge-in: customer talks over the agent
        queue.current = 0
        setSpeaking(false)
      }
      setInterim(text)
      if (final && final.text.trim()) {
        setInterim('')
        onFinalRef.current?.(final.text.trim(), final.confidence || null)
      }
    }
    rec.onerror = () => {}
    rec.onend = () => {
      recRef.current = null
      setListening(false)
      // keep listening while the call is live and the agent isn't talking (unless barge-in is on)
      if (wantListen.current && (bargeIn || !window.speechSynthesis.speaking)) setTimeout(startRec, 150)
    }
    try {
      rec.start()
      recRef.current = rec
      setListening(true)
    } catch {
      recRef.current = null
    }
  }, [bargeIn])

  const stopRec = useCallback(() => {
    try { recRef.current?.abort() } catch { /* noop */ }
    recRef.current = null
    setListening(false)
  }, [])

  const speak = useCallback((text, speaker = 'ai') => {
    if (!supported.tts || muted) {
      if (wantListen.current) startRec()
      return
    }
    if (!bargeIn) stopRec()
    const u = new SpeechSynthesisUtterance(text)
    const v = pickVoice(speaker)
    if (v) u.voice = v
    u.lang = v?.lang || 'en-AU'
    u.rate = 1.03
    u.pitch = speaker === 'human' ? 0.9 : 1.05
    queue.current += 1
    setSpeaking(true)
    u.onend = u.onerror = () => {
      queue.current = Math.max(0, queue.current - 1)
      if (queue.current === 0) {
        setSpeaking(false)
        if (wantListen.current) startRec()
      }
    }
    window.speechSynthesis.speak(u)
    if (bargeIn && wantListen.current) startRec()
  }, [bargeIn, muted, startRec, stopRec, supported.tts])

  const listen = useCallback((on) => {
    wantListen.current = on
    if (on && (bargeIn || !window.speechSynthesis?.speaking)) startRec()
    if (!on) stopRec()
  }, [bargeIn, startRec, stopRec])

  function stopAll() {
    wantListen.current = false
    try { window.speechSynthesis?.cancel() } catch { /* noop */ }
    queue.current = 0
    setSpeaking(false)
    stopRec()
  }

  return { supported, speaking, listening, interim, speak, listen, stopAll, muted, setMuted }
}
