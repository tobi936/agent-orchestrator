import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const root = app?.getPath
  ? join(app.getPath('userData'), 'agent-orchestrator')
  : join(process.cwd(), 'data')

export const dataRoot = root

// userId used for single-user / local Electron mode
export const LOCAL_USER_ID = 'local'

// Legacy paths (local mode aliases)
export const dbFile = join(root, 'users', LOCAL_USER_ID, 'db.json')
export const agentsRoot = join(root, 'users', LOCAL_USER_ID, 'agents')

// User-scoped paths
export function userDataRoot(userId: string): string {
  return join(root, 'users', userId)
}

export function userDbFile(userId: string): string {
  return join(userDataRoot(userId), 'db.json')
}

export function userAgentsRoot(userId: string): string {
  return join(userDataRoot(userId), 'agents')
}

export function agentDir(userId: string, agentId: string): string {
  return join(userAgentsRoot(userId), agentId)
}

export function agentInbox(userId: string, agentId: string): string {
  return join(agentDir(userId, agentId), 'inbox')
}

export function agentOutbox(userId: string, agentId: string): string {
  return join(agentDir(userId, agentId), 'outbox')
}

export function agentWorkspace(userId: string, agentId: string): string {
  return join(agentDir(userId, agentId), 'workspace')
}

export function ensureAgentDirs(userId: string, agentId: string): void {
  for (const dir of [
    agentDir(userId, agentId),
    agentInbox(userId, agentId),
    agentOutbox(userId, agentId),
    agentWorkspace(userId, agentId),
  ]) {
    mkdirSync(dir, { recursive: true })
  }
}

export function ensureUserRoot(userId: string): void {
  mkdirSync(userAgentsRoot(userId), { recursive: true })
}

export function ensureRoot(): void {
  ensureUserRoot(LOCAL_USER_ID)
}
