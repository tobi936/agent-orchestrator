const AGENT_ID = process.env.AGENT_ID
const API_URL = process.env.API_URL
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2'
const SYSTEM_PROMPT = Buffer.from(process.env.SYSTEM_PROMPT_B64 ?? '', 'base64').toString('utf8')
const POLL_INTERVAL_MS = 3000
const OLLAMA_BASE_URL = 'https://api.ollama.com/v1'

if (!AGENT_ID || !API_URL || !OLLAMA_API_KEY) {
  console.error('[worker] Missing required env vars: AGENT_ID, API_URL, OLLAMA_API_KEY')
  process.exit(1)
}

console.log(`[worker] Agent ${AGENT_ID} started — model: ${OLLAMA_MODEL}`)

async function pollInbox() {
  let message
  try {
    const res = await fetch(`${API_URL}/api/agents/${AGENT_ID}/inbox`)
    if (!res.ok) return
    message = await res.json()
    if (!message) return
  } catch (err) {
    console.error('[worker] Inbox poll failed:', err.message)
    return
  }

  console.log(`[worker] Processing message ${message.id}: "${message.content.slice(0, 60)}…"`)

  let reply
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OLLAMA_API_KEY}`,
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message.content },
        ],
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Ollama API ${res.status}: ${body}`)
    }

    const data = await res.json()
    reply = data.choices?.[0]?.message?.content
    if (!reply) throw new Error('Empty response from Ollama')
  } catch (err) {
    console.error('[worker] Ollama call failed:', err.message)
    reply = `[Error] ${err.message}`
  }

  try {
    await fetch(`${API_URL}/api/agents/${AGENT_ID}/outbox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: reply, inboxMessageId: message.id }),
    })
    console.log(`[worker] Reply posted for message ${message.id}`)
  } catch (err) {
    console.error('[worker] Failed to post outbox reply:', err.message)
  }
}

setInterval(pollInbox, POLL_INTERVAL_MS)
pollInbox()
