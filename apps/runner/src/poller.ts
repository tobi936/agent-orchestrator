import { prisma } from './db'
import { createProvider, ChatHistoryMessage } from './providers'
import { appendLog } from './logs'
import { sandboxes } from './sandboxes'
import { executeSandboxTool, executeGhTool, ghTools, FileTracker } from './tools'
import { startAgent } from './start'

const INTERVAL_MS = 3000

const TOOL_INSTRUCTIONS = `

---
You are running inside an isolated cloud sandbox (E2B). You have full root access to a Linux environment and can do anything: install packages, run code, access the internet, read/write files, execute scripts.

You MUST use the following tools to actually perform tasks — never explain how to do something, always do it directly.

Available tools:
- run_command(command): Run any bash command (ls, cat, grep, find, npm, python, curl, git, apt-get, etc.)
- read_file(path): Read the full contents of a file. Must be called before write_file on the same path. Returns cached content if the file has not changed since last read.
- write_file(path, content): Create or overwrite a file. Requires read_file to have been called on the same path first.
- edit_file(path, old_string, new_string): Replace an exact string in a file. Requires the file to have been read first.
- get_repo_map(filter?): Get a symbol index of the repo — all classes, functions, methods with file and line number. Call this first before exploring files. Optionally filter by name substring.
- print_tree(path?, depth?): Print the directory tree starting at path (default: /) up to depth levels deep (default: 3).
- list_directory(path): List files and folders in a directory (non-recursive).
- make_directory(path): Create a directory and all missing parent directories.
- copy_file(source, destination): Copy a file to a new location.
- move_file(source, destination): Move or rename a file.
- delete_file(path): Delete a file.
- search_files(path, pattern, file_glob?): Search for a text/regex pattern across files in a directory. Optionally restrict to files matching file_glob (e.g. "*.ts").

Rules:
- You are inside a sandbox — use tools freely, nothing can break the host system
- Always use tools to complete tasks — never describe what you would do, just do it
- Always call get_repo_map first when starting work on a repo to understand its structure
- Always read_file before write_file or edit_file on any file
- After running a command, always report the actual output to the user
- If you need a package or tool, just install it with run_command`

const GH_INSTRUCTIONS = `

---
You have GitHub tools to fetch data from GitHub without needing a terminal or curl. Use them proactively — never ask the user for information you can fetch yourself.

Available tools:
- gh_get_issue(owner, repo, number): Fetch a GitHub issue. Example: gh_get_issue("tobi936", "agent-orchestrator", 69)
- gh_list_issues(owner, repo, state?): List issues. Example: gh_list_issues("tobi936", "agent-orchestrator")
- gh_get_pull_request(owner, repo, number): Fetch a PR. Example: gh_get_pull_request("tobi936", "agent-orchestrator", 5)
- gh_get_repo(owner, repo): Get repo info. Example: gh_get_repo("tobi936", "agent-orchestrator")

When the user provides a GitHub URL like https://github.com/owner/repo/issues/42, extract owner="owner", repo="repo", number=42 and immediately call gh_get_issue — do not ask the user for the issue details.`

const ORCHESTRATION_INSTRUCTIONS = `

---
You also have orchestration tools to coordinate with other agents, the human, and the agent system:
- route_task(target_agent_id, title, content): Send a follow-up task to another agent when you're done
- route_back(title, content): Send your result back to the agent that delegated this task to you (only if this task was routed to you by another agent)
- ask_human(question): Pause and ask the human user a question; the task resumes when they reply
- create_agent(name, system_prompt, provider, model, repo_url?): Create a new agent
- update_agent(agent_id, name?, system_prompt?, provider?, model?, repo_url?): Update an existing agent's settings

Use route_task when your work needs to be verified or continued by a specific other agent.
Use route_back when you were delegated a task and want to return the result to the delegating agent.
Use ask_human when you need clarification or approval from the human.
Use create_agent / update_agent to build or improve agents as part of your task.`

async function tick() {
  const [tasks, allAgents] = await Promise.all([
    prisma.task.findMany({
      where: { status: 'PENDING', forHuman: false },
      include: {
        agent: {
          select: { id: true, systemPrompt: true, name: true, provider: true, model: true, repoUrl: true, maxToolIterations: true, allowedTools: true, status: true },
        },
        thread: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.agent.findMany({ select: { id: true, name: true, systemPrompt: true, status: true } }),
  ])

  // Auto-start any agents that have pending tasks but are currently stopped
  const autoStartSetting = await prisma.systemSetting.findUnique({ where: { key: 'autoStart' } })
  const autoStartEnabled = autoStartSetting ? autoStartSetting.value === 'true' : true

  if (autoStartEnabled) {
    const agentsToStart = new Set<string>()
    for (const t of tasks) {
      if (t.agent.status !== 'RUNNING') {
        agentsToStart.add(t.agent.id)
      }
    }
    for (const aid of agentsToStart) {
      const startResult = await startAgent(aid)
      if (startResult.ok) {
        appendLog(aid, `[${new Date().toISOString()}] Auto-started agent (via pending task)`)
      } else {
        appendLog(aid, `[${new Date().toISOString()}] Auto-start failed: ${startResult.error}`)
      }
    }
  }

  for (const task of tasks) {
    const { agent } = task
    appendLog(agent.id, `[${new Date().toISOString()}] Processing task ${task.id}: "${task.title}" (${agent.provider}/${agent.model})`)

    await prisma.task.update({ where: { id: task.id }, data: { status: 'IN_PROGRESS' } })

    let reply: string
    let routeTarget: { agentId: string; title: string; content: string } | null = null
    let routeBackTarget: { title: string; content: string } | null = null
    let askHumanQuestion: string | null = null

    try {
      const provider = createProvider({ provider: agent.provider, model: agent.model })
      const sandbox = sandboxes.get(agent.id)
      const fileTracker = new FileTracker()

      const otherAgents = allAgents.filter((a) => a.id !== agent.id)
      const agentList = otherAgents.length > 0
        ? `\n\n---\nAvailable agents you can delegate tasks to via route_task or route_back:\n${otherAgents.map((a) => `- ${a.name} (id: ${a.id}) — ${a.systemPrompt.slice(0, 300)}`).join('\n')}`
        : ''

      const allowedSet = agent.allowedTools.length > 0 ? new Set(agent.allowedTools) : null
      const hasGhTools = allowedSet === null || ghTools.some((t) => allowedSet.has(t.function.name))

      let systemPrompt = agent.systemPrompt + agentList + ORCHESTRATION_INSTRUCTIONS
      if (hasGhTools) systemPrompt += GH_INSTRUCTIONS
      if (sandbox) {
        systemPrompt += TOOL_INSTRUCTIONS
        if (agent.repoUrl) {
          systemPrompt += `\n- The repository ${agent.repoUrl} has already been cloned to /workspace`
        }
      }

      // Build history from thread; last user message is the active prompt
      const threadMessages = task.thread
      const lastUserMsg = [...threadMessages].reverse().find((m) => m.role === 'user')
      const userMessage = lastUserMsg ? lastUserMsg.content : task.content
      const historyMessages = lastUserMsg
        ? threadMessages.slice(0, threadMessages.indexOf(lastUserMsg))
        : threadMessages

      const history: ChatHistoryMessage[] = historyMessages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))

      reply = await provider.chat(
        systemPrompt,
        userMessage,
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
          if (toolName === 'route_back') {
            if (!task.fromAgentId) {
              return `Error: this task was not delegated by another agent — route_back cannot be used`
            }
            routeBackTarget = { title: toolInput.title, content: toolInput.content }
            return `Result routed back to delegating agent`
          }
          if (toolName === 'ask_human') {
            askHumanQuestion = toolInput.question
            return `Question sent to human: ${toolInput.question}`
          }
          if (toolName === 'create_agent') {
            const created = await prisma.agent.create({
              data: {
                name: toolInput.name,
                systemPrompt: toolInput.system_prompt,
                provider: toolInput.provider ?? 'anthropic',
                model: toolInput.model ?? 'claude-haiku-4-5-20251001',
                repoUrl: toolInput.repo_url ?? null,
              },
            })
            appendLog(agent.id, `[agent] Created agent "${created.name}" (${created.id}), starting sandbox…`)
            const startResult = await startAgent(created.id)
            const status = startResult.ok ? 'running' : `start failed: ${startResult.error}`
            return `Agent created and started: ${created.name} (id: ${created.id}, status: ${status})`
          }
          if (toolName === 'update_agent') {
            const data: Record<string, string> = {}
            if (toolInput.name) data.name = toolInput.name
            if (toolInput.system_prompt) data.systemPrompt = toolInput.system_prompt
            if (toolInput.provider) data.provider = toolInput.provider
            if (toolInput.model) data.model = toolInput.model
            if (toolInput.repo_url !== undefined) data.repoUrl = toolInput.repo_url
            await prisma.agent.update({ where: { id: toolInput.agent_id }, data })
            appendLog(agent.id, `[agent] Updated agent ${toolInput.agent_id}: ${JSON.stringify(data)}`)
            return `Agent ${toolInput.agent_id} updated: ${Object.keys(data).join(', ')}`
          }
          if (toolName.startsWith('gh_')) {
            const inputSummary = Object.values(toolInput).join(', ')
            appendLog(agent.id, `[tool] ${toolName}: ${inputSummary}`)
            const result = await executeGhTool(toolName, toolInput as Record<string, string | number>)
            appendLog(agent.id, `[tool] ${toolName} — ${result.startsWith('GitHub API error') || result.startsWith('Error') ? 'error' : 'ok'}`)
            return result
          }
          if (sandbox) {
            const inputSummary = Object.entries(toolInput).map(([k, v]) => `${k}=${String(v).slice(0, 60)}`).join(', ')
            appendLog(agent.id, `[tool] ${toolName}: ${inputSummary}`)
            const result = await executeSandboxTool(toolName, toolInput, sandbox, fileTracker)
            const status = result.startsWith('Error') ? 'error' : 'ok'
            appendLog(agent.id, `[tool] ${toolName} — ${status}`)
            return result
          }
          return `Tool ${toolName} not available without sandbox`
        },
        agent.allowedTools.length > 0 ? agent.allowedTools : undefined,
      )

      appendLog(agent.id, `[${new Date().toISOString()}] Reply generated (${reply.length} chars)`)
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      appendLog(agent.id, `[${new Date().toISOString()}] ERROR: ${error}`)
      reply = `[Error] ${error}`
    }

    const pauseForHuman = askHumanQuestion || reply === '[Max tool iterations reached]'

    if (pauseForHuman) {
      await prisma.$transaction([
        prisma.taskMessage.create({ data: { taskId: task.id, role: 'agent', content: reply } }),
        prisma.task.update({ where: { id: task.id }, data: { status: 'PENDING', forHuman: true } }),
      ])
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.taskMessage.create({ data: { taskId: task.id, role: 'agent', content: reply } })
        await tx.task.update({ where: { id: task.id }, data: { status: 'DONE' } })
        if (routeTarget) {
          await tx.task.create({
            data: {
              agentId: routeTarget.agentId,
              fromAgentId: agent.id,
              title: routeTarget.title,
              content: routeTarget.content,
              thread: { create: [{ role: 'user', content: routeTarget.content }] },
            },
          })
        }
        if (routeBackTarget && task.fromAgentId) {
          await tx.task.create({
            data: {
              agentId: task.fromAgentId,
              fromAgentId: agent.id,
              title: routeBackTarget.title,
              content: routeBackTarget.content,
              thread: { create: [{ role: 'user', content: routeBackTarget.content }] },
            },
          })
        }
      })
    }
  }
  // Auto-stop agents that are running but have no pending or in-progress tasks
  const autoStopSetting = await prisma.systemSetting.findUnique({ where: { key: 'autoStop' } })
  const autoStopEnabled = autoStopSetting ? autoStopSetting.value === 'true' : true

  if (autoStopEnabled) {
    for (const a of allAgents) {
      if (a.status === 'RUNNING' && !sandboxes.has(a.id)) {
        continue
      }
      if (a.status === 'RUNNING') {
        const active = await prisma.task.count({
          where: { agentId: a.id, status: { in: ['PENDING', 'IN_PROGRESS'] }, forHuman: false },
        })
        if (active === 0) {
          const sandbox = sandboxes.get(a.id)
          if (sandbox) {
            await sandbox.kill().catch(() => {})
            sandboxes.delete(a.id)
          }
          await prisma.agent.update({ where: { id: a.id }, data: { status: 'STOPPED' } })
          appendLog(a.id, `[${new Date().toISOString()}] Auto-stopped idle agent`)
        }
      }
    }
  }
}

export function startPoller() {
  console.log('[poller] Started — polling every', INTERVAL_MS, 'ms')
  setInterval(() => { tick().catch(console.error) }, INTERVAL_MS)
  tick().catch(console.error)
}
