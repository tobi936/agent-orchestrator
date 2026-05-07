import { prisma } from './db'
import { createProvider, ChatHistoryMessage } from './providers'
import { appendLog } from './logs'
import { sandboxes } from './sandboxes'
import { executeSandboxTool } from './tools'

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

const ORCHESTRATION_INSTRUCTIONS = `

---
You also have orchestration tools to coordinate with other agents and the human:
- route_task(target_agent_id, title, content): When you're done, send a follow-up task to another agent
- ask_human(question): If you need input from the human user, call this to pause and wait for their reply

Use route_task when your work needs to be verified or continued by another agent.
Use ask_human when you need clarification or approval from the human before proceeding.`

async function tick() {
  const tasks = await prisma.task.findMany({
    where: { status: 'PENDING', forHuman: false, agent: { status: 'RUNNING' } },
    include: {
      agent: {
        select: { id: true, systemPrompt: true, name: true, provider: true, model: true, repoUrl: true, maxToolIterations: true },
      },
      thread: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'asc' },
  })

  for (const task of tasks) {
    const { agent } = task
    appendLog(agent.id, `[${new Date().toISOString()}] Processing task ${task.id}: "${task.title}" (${agent.provider}/${agent.model})`)

    await prisma.task.update({ where: { id: task.id }, data: { status: 'IN_PROGRESS' } })

    let reply: string
    let routeTarget: { agentId: string; title: string; content: string } | null = null
    let askHumanQuestion: string | null = null

    try {
      const provider = createProvider({ provider: agent.provider, model: agent.model })
      const sandbox = sandboxes.get(agent.id)

      let systemPrompt = agent.systemPrompt + ORCHESTRATION_INSTRUCTIONS
      if (sandbox) {
        systemPrompt += TOOL_INSTRUCTIONS
        if (agent.repoUrl) {
          systemPrompt += `\n- The repository ${agent.repoUrl} has already been cloned to /workspace`
        }
      }

      const history: ChatHistoryMessage[] = task.thread.map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))

      reply = await provider.chat(
        systemPrompt,
        task.content,
        sandbox ?? null,
        (line) => appendLog(agent.id, line),
        history,
        agent.maxToolIterations,
        async (toolName, toolInput) => {
          if (toolName === 'route_task') {
            routeTarget = {
              agentId: toolInput.target_agent_id,
              title: toolInput.title,
              content: toolInput.content,
            }
            return `Task routed to agent ${toolInput.target_agent_id}`
          }
          if (toolName === 'ask_human') {
            askHumanQuestion = toolInput.question
            return `Question sent to human: ${toolInput.question}`
          }
          if (sandbox) return executeSandboxTool(toolName, toolInput, sandbox)
          return `Tool ${toolName} not available without sandbox`
        },
      )

      appendLog(agent.id, `[${new Date().toISOString()}] Reply generated (${reply.length} chars)`)
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      appendLog(agent.id, `[${new Date().toISOString()}] ERROR: ${error}`)
      reply = `[Error] ${error}`
    }

    if (askHumanQuestion) {
      await prisma.$transaction([
        prisma.taskMessage.create({ data: { taskId: task.id, role: 'agent', content: reply } }),
        prisma.task.update({ where: { id: task.id }, data: { status: 'PENDING', forHuman: true } }),
      ])
    } else {
      await prisma.$transaction(async (tx: typeof prisma) => {
        await tx.taskMessage.create({ data: { taskId: task.id, role: 'agent', content: reply } })
        await tx.task.update({ where: { id: task.id }, data: { status: 'DONE' } })
        if (routeTarget) {
          await tx.task.create({
            data: {
              agentId: routeTarget.agentId,
              fromAgentId: agent.id,
              title: routeTarget.title,
              content: routeTarget.content,
            },
          })
        }
      })
    }
  }
}

export function startPoller() {
  console.log('[poller] Started — polling every', INTERVAL_MS, 'ms')
  setInterval(() => { tick().catch(console.error) }, INTERVAL_MS)
  tick().catch(console.error)
}
