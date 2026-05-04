import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

function getRoot(): string {
  if (process.env.AGENT_DATA_DIR) return process.env.AGENT_DATA_DIR
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const electron = require('electron') as { app: { getPath(n: string): string } }
    return join(electron.app.getPath('userData'), 'agent-orchestrator')
  } catch {
    return join(process.cwd(), 'data')
  }
}

const root = getRoot()

export const dataRoot = root
export const dbFile = join(root, 'db.json')
export const agentsRoot = join(root, 'agents')

export function agentDir(id: string): string {
  return join(agentsRoot, id)
}

export function agentInbox(id: string): string {
  return join(agentDir(id), 'inbox')
}

export function agentOutbox(id: string): string {
  return join(agentDir(id), 'outbox')
}

export function agentWorkspace(id: string): string {
  return join(agentDir(id), 'workspace')
}

export function ensureAgentDirs(id: string): void {
  for (const dir of [agentDir(id), agentInbox(id), agentOutbox(id), agentWorkspace(id)]) {
    mkdirSync(dir, { recursive: true })
  }
}

export function ensureRoot(): void {
  mkdirSync(agentsRoot, { recursive: true })
}
