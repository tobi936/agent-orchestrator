import { Sandbox } from 'e2b'
import { prisma } from './db'
import { appendLog, clearBuffer } from './logs'
import { sandboxes } from './sandboxes'

export async function startAgent(agentId: string): Promise<{ ok: boolean; error?: string }> {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } })
  if (!agent) return { ok: false, error: 'Agent not found' }
  if (agent.status === 'RUNNING') return { ok: true }

  clearBuffer(agentId)
  const ts = () => new Date().toISOString()

  let sandbox: Sandbox
  try {
    appendLog(agentId, `[${ts()}] Creating E2B sandbox…`)
    sandbox = await Sandbox.create({ timeoutMs: 3_600_000 })
    sandboxes.set(agentId, sandbox)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    appendLog(agentId, `[${ts()}] Failed to create sandbox: ${msg}`)
    return { ok: false, error: msg }
  }

  await prisma.agent.update({
    where: { id: agentId },
    data: { status: 'RUNNING', containerId: sandbox.sandboxId },
  })
  appendLog(agentId, `[${ts()}] Sandbox ${sandbox.sandboxId} ready`)

  runStartup(agentId, agent.repoUrl ?? null, agent.command ?? null, sandbox)
  return { ok: true }
}

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
        appendLog(agentId, `[${ts()}] Configuring git credentials from GITHUB_TOKEN…`)
        await sandbox.commands.run(
          `git config --global credential.helper store && ` +
          `echo "https://oauth2:${githubToken}@github.com" > ~/.git-credentials && ` +
          `git config --global user.email "nexus@agent-orchestrator" && ` +
          `git config --global user.name "nexus"`,
          { timeoutMs: 10_000 },
        )
      } else {
        await sandbox.commands.run(
          `git config --global user.email "nexus@agent-orchestrator" && git config --global user.name "nexus"`,
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
