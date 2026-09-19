# Voice Agent Frontend

Browser-based React frontend for a compliance-aware AI voice call system. Handles real-time customer calls with voice input/output, field capture, and warm handoff to human agents.

## Features

### Customer Interface
- **Voice Calling**: Chrome Web Speech API for hands-free calling (no Twilio)
- **Barge-in Support**: Customer can interrupt the AI agent mid-sentence with headphones
- **Typing Fallback**: Type responses when voice isn't available
- **Live Transcription**: See interim speech text as you speak
- **Mic Toggle**: Enable/disable microphone and mute agent voice

### Agent Console
- **Live Field Capture**: See each field as it's extracted from speech
- **Escalation Monitoring**: Real-time escalation score (0-4) with visual meter
- **Warm Handoff Card**: Detailed context for human agent takeover showing:
  - Captured fields with confidence scores
  - Missing required fields
  - Current conversation step
  - Recording consent status
  - Reason for escalation
- **Manual Field Edit**: Correct captured values before submission
- **Call Submission**: Submit the journey payload to the sandbox

### Insights & Analytics
- **Compliance Analysis**: Transcript analysis identifying compliance gaps
- **Script Browser**: Review the conversation flow and rules
- **Metrics Dashboard**: Call statistics and persona simulation runner
- **Leads Queue**: Lead list with DNC/opt-out status and attempt history

## Tech Stack

- **React 18** with Hooks
- **Vite** for build and dev server
- **Chrome Web Speech API** for STT/TTS (no external API keys)
- **WebSocket** for real-time backend communication
- **CSS Grid/Flexbox** for responsive layouts

## Project Structure

```
src/
├── api.js                 # WebSocket client, constants, formatting utils
├── useSpeech.js          # Chrome Web Speech API hook (STT/TTS)
├── main.jsx              # React entry point
├── App.jsx               # Main app layout and routing
├── App.css               # Global styles
└── components/
    ├── CustomerPhone.jsx # Customer call interface
    ├── AgentConsole.jsx  # Agent monitoring console
    ├── LeadsPanel.jsx    # Lead queue and dialer
    ├── MetricsPage.jsx   # Harness runner and stats
    ├── InsightsPage.jsx  # Compliance analysis
    └── ScriptPage.jsx    # Script viewer
index.html                # HTML template
vite.config.js            # Vite configuration
package.json              # Dependencies and scripts
```

## Setup

### Prerequisites
- Node.js 18+
- Chrome or Chromium-based browser (for Web Speech API)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Server runs on `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

## Backend Connection

The frontend connects to a FastAPI backend via WebSocket at `/ws/call/{callId}`.

Backend URL is configured in `src/api.js`:
```javascript
const API_HOST = 'http://localhost:8000'
```

## Key Components

### CustomerPhone
- **Props**: `callId`, `lead`, `onClose`
- **State**: Messages, call status, text input, mic toggle, barge-in
- **Features**: 
  - Real-time voice input/output
  - Message history display
  - Interim speech text
  - Manual text input with confidence score (0.95)
  - Hangup button

### AgentConsole
- **Props**: `call`, `send`, `agentName`, `setAgentName`
- **State**: Reply text, field edits
- **Features**:
  - Escalation meter
  - Captured fields table with confirmation status
  - Handoff card with full context
  - Human agent tools (say to customer, submit, end call)
  - Submission result display with payload

### LeadsPanel
- **Features**: Lead queue, call history, attempt count
- **Gate Display**: Shows DNC/opt-out status, attempt limit
- **Actions**: Click to start call

### MetricsPage
- **Features**: Persona selector, run simulation, results table
- **Metrics**: Call duration, words spoken, re-asks, web form instructions

### InsightsPage
- **Features**: Transcript analyzer, compliance findings
- **Analysis**: 7 compliance checks (disclosure, payment, pitch-after-decline, etc.)
- **Baseline**: Manual call metrics for comparison

### ScriptPage
- **Features**: Interactive script browser
- **Navigation**: Stage selector, field explorer

## Voice Configuration

The `useSpeech` hook provides:
- **STT Languages**: English (en-US), English (en-AU), and others
- **TTS Voices**: Browser default or custom selection
- **Recognition Settings**:
  - Continuous speech recognition
  - Interim results enabled
  - Auto-restart on timeout (10s)
- **Barge-in**: Stops TTS when customer starts speaking (with headphones)
- **Mute**: Silent mode (no TTS output)

### Browser Support

- ✅ Chrome/Edge 25+
- ✅ Safari 14.1+
- ❌ Firefox (no Web Speech API)

Web Speech API uses browser's default voices—no external API keys needed.

## Styling

Global styles in `App.css` cover:
- Panel layout (sidebar, main, console)
- Chat bubbles (customer, agent, interim)
- Buttons, forms, toggles
- Status pills and meters
- Tables and grids
- Responsive mobile/tablet layouts

## API Communication

### Messages from Frontend → Backend

```javascript
{
  type: 'utterance',
  text: 'customer speech or typed text',
  confidence: 0.95  // ASR confidence score
}

{
  type: 'human_say',
  call_id: '...',
  text: 'human agent voice message'
}

{
  type: 'set_field',
  call_id: '...',
  field: 'email',
  value: 'new@example.com'
}

{
  type: 'submit',
  call_id: '...'
}

{
  type: 'accept',
  call_id: '...',
  agent_name: 'John'
}

{
  type: 'end',
  call_id: '...'
}

{
  type: 'force_handoff',
  call_id: '...'
}

{
  type: 'hangup'
}
```

### Messages from Backend → Frontend

```javascript
{
  type: 'say',
  speaker: 'ai' | 'human',
  text: 'spoken text'
}

{
  type: 'handoff',
  // Card shown to human agent with context
}

{
  type: 'ended',
  outcome: 'completed' | 'declined' | 'error' | ...
}
```

## Testing

Run the full system:
1. Start backend: `cd ../backend && python -m uvicorn app.main:app --reload`
2. Start frontend: `npm run dev`
3. Open http://localhost:5173
4. Select a lead and click "Call"
5. Speak into your mic or type in the text field

For persona simulations:
1. Go to **Metrics** page
2. Select a persona (e.g., "Busy, not interested")
3. Click "Run simulation"
4. Watch the call unfold automatically

## Performance

- **Bundle**: ~45KB gzipped (React + dependencies)
- **Network**: WebSocket connection to backend
- **CPU**: Low (voice API handled by browser)
- **Memory**: ~50MB typical (React + voice buffers)

## Accessibility

- **ARIA labels** on interactive elements
- **Keyboard navigation**: Tab through call controls
- **Screen reader support**: Chat messages read aloud
- **High contrast**: Status pills and buttons meet WCAG AA
- **Voice alternative**: Text input for accessibility

## Troubleshooting

### Mic not working
- Check Chrome permissions: Settings → Privacy → Microphone
- Ensure "Allow" is set for localhost:5173
- Try switching browsers (Chrome → Edge)

### No audio output
- Check system volume
- Enable speaker: toggle "🔊 Agent speaking" on
- Try mute toggle to reset

### Connection errors
- Check backend is running on http://localhost:8000
- WebSocket connection requires same origin (http:// or https://)
- Check browser console for network errors

### Web Speech API not supported
- Show message: "Use Chrome for voice"
- Fallback to text input works in all browsers

## Deployment

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Docker
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

## Contributing

1. Create a branch for your feature
2. Update components as needed
3. Test with persona simulations
4. Submit PR with description

## License

Built for Hackathon 2026. Backend integration required.

---

**Backend Repository**: [IVR Voice Assist](https://github.com/raghav18482/IVR-voice-assist)
