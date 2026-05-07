import { prisma } from './db'
import { createProvider, ChatHistoryMessage } from './providers'
import { appendLog } from './logs'
import { sandboxes } from './sandboxes'

const MAX_HISTORY = 20

const INTERVAL_MS = 3000

const TOOL_INSTRUCTIONS = `

---
You have access to a live sandbox environment. You MUST use the following tools to actually perform tasks — never just explain how to do something, always do it directly.

Available tools:
- run_command(command): Run any bash command (ls, cat, grep, find, npm, python, curl, git, etc.)
- read_file(path): Read the full contents of a file
- write_file(path, content): Create or overwrite a file
- edit_file(path, old_string, new_string): Replace an exact string in a file

Rules:
- Always use tools to complete tasks — never describe what you would do, just do it
- After running a command, always report the actual output to the user`

async function tick() {
  const messages = await prisma.message.findMany({
    where: { direction: 'INBOX', processed: false, agent: { status: 'RUNNING' } },
    include: {
      agent: {
        select: { id: true, systemPrompt: true, name: true, provider: true, model: true, repoUrl: true, maxToolIterations: true },
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

      let systemPrompt = agent.systemPrompt
      if (sandbox) {
        systemPrompt += TOOL_INSTRUCTIONS
        if (agent.repoUrl) {
          systemPrompt += `\n- The repository ${agent.repoUrl} has already been cloned to /workspace`
        }
      }

      const previousMessages = await prisma.message.findMany({
        where: { agentId: agent.id, id: { not: msg.id } },
        orderBy: { createdAt: 'asc' },
        take: MAX_HISTORY,
      })
      const history: ChatHistoryMessage[] = previousMessages.map((m) => ({
        role: m.direction === 'INBOX' ? 'user' : 'assistant',
        content: m.content,
      }))

      reply = await provider.chat(systemPrompt, msg.content, sandbox, (line) => appendLog(agent.id, line), history, agent.maxToolIterations)
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
