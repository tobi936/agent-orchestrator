import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { dataRoot, ensureRoot } from './paths.js'
import type { ServerConfig } from '../shared/types.js'

const configFile = join(dataRoot, 'server-config.json')

export function readServerConfig(): ServerConfig | null {
  try {
    if (!existsSync(configFile)) return null
    return JSON.parse(readFileSync(configFile, 'utf8')) as ServerConfig
  } catch {
    return null
  }
}

export function writeServerConfig(config: ServerConfig): void {
  ensureRoot()
  writeFileSync(configFile, JSON.stringify(config, null, 2))
}

export function clearServerToken(): void {
  const config = readServerConfig()
  if (config) {
    const { token: _t, ...rest } = config
    writeServerConfig(rest)
  }
}
