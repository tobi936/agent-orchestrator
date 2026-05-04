import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// Shared location accessible by both Electron and the web server on the same machine.
// Electron syncs ~/.claude here on startup; the web server reads from here.
const SHARED_AUTH_ROOT = join(homedir(), '.agent-orchestrator', 'claude-auth')

const LOCAL_CLAUDE_DIR = join(homedir(), '.claude')
const LOCAL_CLAUDE_JSON = join(homedir(), '.claude.json')
const SHARED_CLAUDE_DIR = join(SHARED_AUTH_ROOT, 'dot-claude')
const SHARED_CLAUDE_JSON = join(SHARED_AUTH_ROOT, 'dot-claude.json')

export function syncClaudeAuth(): boolean {
  if (!existsSync(LOCAL_CLAUDE_DIR) && !existsSync(LOCAL_CLAUDE_JSON)) return false
  mkdirSync(SHARED_AUTH_ROOT, { recursive: true })
  if (existsSync(LOCAL_CLAUDE_DIR)) {
    cpSync(LOCAL_CLAUDE_DIR, SHARED_CLAUDE_DIR, { recursive: true, force: true })
  }
  if (existsSync(LOCAL_CLAUDE_JSON)) {
    copyFileSync(LOCAL_CLAUDE_JSON, SHARED_CLAUDE_JSON)
  }
  return true
}

// Returns the paths the Docker container should mount for Claude auth.
// Prefers the shared synced copy; falls back to the local ~/.claude directly.
export function getClaudeAuthBinds(): string[] {
  const dir = existsSync(SHARED_CLAUDE_DIR) ? SHARED_CLAUDE_DIR : LOCAL_CLAUDE_DIR
  const json = existsSync(SHARED_CLAUDE_JSON) ? SHARED_CLAUDE_JSON : LOCAL_CLAUDE_JSON

  const binds: string[] = []
  if (existsSync(dir)) binds.push(`${dir}:/home/agent/.claude`)
  if (existsSync(json)) binds.push(`${json}:/home/agent/.claude.json:ro`)
  return binds
}

export function hasClaudeAuth(): boolean {
  return (
    existsSync(SHARED_CLAUDE_DIR) ||
    existsSync(SHARED_CLAUDE_JSON) ||
    existsSync(LOCAL_CLAUDE_DIR)
  )
}
