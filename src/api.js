export async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data?.detail?.message || res.statusText), { data, status: res.status })
  return data
}

export function wsUrl(path) {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}${path}`
}

export const fmtSecs = (s) => {
  if (s == null) return '–'
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.round(s % 60)).padStart(2, '0')}`
}

export const OUTCOME_LABEL = {
  submitted: 'Submitted by AI',
  submitted_by_human: 'Submitted after handoff',
  declined: 'Declined',
  opt_out: 'Opted out',
  callback: 'Callback booked',
  callback_priority: 'Priority callback',
  no_consent: 'No recording consent',
  ineligible: 'Ineligible',
  declined_at_consent: 'Declined at consent',
  customer_hung_up: 'Customer hung up',
  ended_by_agent: 'Ended by agent',
}
