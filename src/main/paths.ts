import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const root = app?.getPath
  ? join(app.getPath('userData'), 'agent-orchestrator')
  : join(process.cwd(), 'data')

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
