import express from 'express'
import cors from 'cors'
import { Sandbox } from 'e2b'
import { prisma } from './db'
import { startPoller } from './poller'
import { appendLog, clearBuffer, getBuffer, onLog, offLog } from './logs'
import { sandboxes } from './sandboxes'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

// ── Start agent ───────────────────────────────────────────────────────────────
app.post('/agents/:id/start', async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id } })
  if (!agent) return res.status(404).json({ error: 'Not found' })
  if (agent.status === 'RUNNING') return res.status(409).json({ error: 'Already running' })

  clearBuffer(agent.id)
  const ts = () => new Date().toISOString()

  let sandbox: Sandbox
  try {
    appendLog(agent.id, `[${ts()}] Creating E2B sandbox…`)
    sandbox = await Sandbox.create({ timeoutMs: 3_600_000 })
    sandboxes.set(agent.id, sandbox)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    appendLog(agent.id, `[${ts()}] Failed to create sandbox: ${msg}`)
    return res.status(500).json({ error: msg })
  }

  await prisma.agent.update({
    where: { id: agent.id },
    data: { status: 'RUNNING', containerId: sandbox.sandboxId },
  })
  appendLog(agent.id, `[${ts()}] Sandbox ${sandbox.sandboxId} ready`)

  runStartup(agent.id, agent.repoUrl ?? null, agent.command ?? null, sandbox)

  return res.json(await prisma.agent.findUnique({ where: { id: agent.id } }))
})

async function runStartup(
  agentId: string,
  repoUrl: string | null,
  command: string | null,
  sandbox: Sandbox,
) {
  const ts = () => new Date().toISOString()

  try {
    if (repoUrl) {
      appendLog(agentId, `[${ts()}] Ensuring git is available…`)
      await sandbox.commands.run('which git || (apt-get update -qq && apt-get install -y -qq git)', {
        timeoutMs: 60_000,
        onStderr: (d) => appendLog(agentId, d),
      })

      const githubToken = process.env.GITHUB_TOKEN
      if (githubToken) {
        // Use provided token — enables private repos, push, full git access
        appendLog(agentId, `[${ts()}] Configuring git credentials from GITHUB_TOKEN…`)
        await sandbox.commands.run(
          `git config --global credential.helper store && ` +
          `echo "https://oauth2:${githubToken}@github.com" > ~/.git-credentials && ` +
          `git config --global user.email "nexus@agent-orchestrator" && ` +
          `git config --global user.name "nexus"`,
          { timeoutMs: 10_000 },
        )
      } else {
        // No token — configure a generic identity so commits work on public repos
        appendLog(agentId, `[${ts()}] No GITHUB_TOKEN set — configuring anonymous git identity…`)
        await sandbox.commands.run(
          `git config --global user.email "nexus@agent-orchestrator" && ` +
          `git config --global user.name "nexus"`,
          { timeoutMs: 10_000 },
        )
      }

      await sandbox.commands.run('mkdir -p /workspace', { timeoutMs: 10_000 })
      appendLog(agentId, `[${ts()}] Cloning ${repoUrl}…`)
      const clone = await sandbox.commands.run(`git clone --depth=1 "${repoUrl}" /workspace`, {
        timeoutMs: 120_000,
        onStdout: (d) => appendLog(agentId, d),
        onStderr: (d) => appendLog(agentId, d),
      })
      if (clone.exitCode !== 0) {
        appendLog(agentId, `[${ts()}] git clone failed (exit code ${clone.exitCode})`)
      } else {
        appendLog(agentId, `[${ts()}] Repo cloned to /workspace`)
      }
    }

    if (command) {
      appendLog(agentId, `[${ts()}] Running: ${command}`)
      const result = await sandbox.commands.run(command, {
        timeoutMs: 3_600_000,
        cwd: repoUrl ? '/workspace' : undefined,
        onStdout: (d) => appendLog(agentId, d),
        onStderr: (d) => appendLog(agentId, `[stderr] ${d}`),
      })
      appendLog(agentId, `[${ts()}] Process exited (code ${result.exitCode})`)
    } else {
      appendLog(agentId, `[${ts()}] Sandbox ready — send messages to interact`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    appendLog(agentId, `[${ts()}] ERROR: ${msg}`)
  } finally {
    if (sandboxes.has(agentId) && command) {
      sandboxes.delete(agentId)
      prisma.agent.update({ where: { id: agentId }, data: { status: 'STOPPED' } }).catch(() => {})
    }
  }
}

// ── Stop agent ────────────────────────────────────────────────────────────────
app.post('/agents/:id/stop', async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id } })
  if (!agent) return res.status(404).json({ error: 'Not found' })
  if (agent.status === 'STOPPED') return res.status(409).json({ error: 'Already stopped' })

  const sandbox = sandboxes.get(agent.id)
  if (sandbox) {
    sandbox.kill().catch(() => {})
    sandboxes.delete(agent.id)
  }

  const updated = await prisma.agent.update({
    where: { id: agent.id },
    data: { status: 'STOPPED' },
  })
  appendLog(agent.id, `[${new Date().toISOString()}] Agent "${agent.name}" stopped`)
  return res.json(updated)
})

// ── SSE log stream ────────────────────────────────────────────────────────────
app.get('/agents/:id/logs', (req, res) => {
  const { id } = req.params

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  for (const line of getBuffer(id)) {
    res.write(`data: ${JSON.stringify(line)}\n\n`)
  }

  const handler = (line: string) => res.write(`data: ${JSON.stringify(line)}\n\n`)
  onLog(id, handler)
  req.on('close', () => offLog(id, handler))
})

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`[runner] Listening on http://localhost:${PORT}`)
  startPoller()
})
