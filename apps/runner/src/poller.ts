import { prisma } from './db'
import { createProvider } from './providers'
import { appendLog } from './logs'
import { sandboxes } from './sandboxes'

const INTERVAL_MS = 3000

async function tick() {
  const messages = await prisma.message.findMany({
    where: { direction: 'INBOX', processed: false, agent: { status: 'RUNNING' } },
    include: {
      agent: {
        select: { id: true, systemPrompt: true, name: true, provider: true, model: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  for (const msg of messages) {
    const { agent } = msg
    appendLog(agent.id, `[${new Date().toISOString()}] Processing message ${msg.id} (${agent.provider}/${agent.model})`)

    await prisma.message.update({ where: { id: msg.id }, data: { processed: true } })

    let reply: string
    try {
      const provider = createProvider({ provider: agent.provider, model: agent.model })
      const sandbox = sandboxes.get(agent.id)
      reply = await provider.chat(agent.systemPrompt, msg.content, sandbox)
      appendLog(agent.id, `[${new Date().toISOString()}] Reply generated (${reply.length} chars)`)
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      appendLog(agent.id, `[${new Date().toISOString()}] ERROR: ${error}`)
      reply = `[Error] ${error}`
    }

    await prisma.message.create({
      data: {
        agentId: agent.id,
        direction: 'OUTBOX',
        content: reply,
        processed: true,
      },
    })
  }
}

export function startPoller() {
  console.log('[poller] Started — polling every', INTERVAL_MS, 'ms')
  setInterval(() => { tick().catch(console.error) }, INTERVAL_MS)
  tick().catch(console.error)
}
