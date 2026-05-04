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
