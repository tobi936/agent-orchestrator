import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { homedir } from 'node:os'
import { readServerConfig } from './server-config.js'
import type { ClaudeCredentialBundle } from './server/credentials-router.js'

function collectFiles(dir: string, baseDir: string): Array<{ path: string; content: string }> {
  const result: Array<{ path: string; content: string }> = []
  if (!existsSync(dir)) return result
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      result.push(...collectFiles(full, baseDir))
    } else if (entry.isFile()) {
      result.push({
        path: relative(homedir(), full),
        content: readFileSync(full).toString('base64'),
      })
    }
  }
  return result
}

function buildBundle(): ClaudeCredentialBundle | null {
  const home = homedir()
  const claudeDir = join(home, '.claude')
  const claudeJson = join(home, '.claude.json')

  const files = collectFiles(claudeDir, home)

  if (existsSync(claudeJson) && statSync(claudeJson).isFile()) {
    files.push({
      path: '.claude.json',
      content: readFileSync(claudeJson).toString('base64'),
    })
  }

  if (files.length === 0) return null
  return { files, exportedAt: new Date().toISOString() }
}

export async function uploadCredentials(): Promise<void> {
  const config = readServerConfig()
  if (!config?.serverUrl || !config.token) return

  const bundle = buildBundle()
  if (!bundle) return

  const authHeader = { Authorization: `Bearer ${config.token}` }
  const baseUrl = config.serverUrl

  // Skip upload if server already has newer credentials
  try {
    const statusRes = await fetch(`${baseUrl}/api/auth/credentials/status`, { headers: authHeader })
    if (statusRes.ok) {
      const status = await statusRes.json() as { hasCredentials: boolean; exportedAt?: string }
      if (status.hasCredentials && status.exportedAt && status.exportedAt >= bundle.exportedAt) {
        return
      }
    }
  } catch {
    return
  }

  try {
    await fetch(`${baseUrl}/api/auth/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ bundle }),
    })
  } catch {
    // silent failure – retry on next start
  }
}
