import Docker from 'dockerode'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { EventEmitter } from 'node:events'
import { agentInbox, agentOutbox, agentWorkspace } from './paths.js'
import { extractCredentialsToDir } from './server/credentials-router.js'
import type { LogLine } from '../shared/types.js'

const DOCKER_DESKTOP_PATHS = [
  'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
  'C:\\Program Files (x86)\\Docker\\Docker\\Docker Desktop.exe',
]

export const AGENT_IMAGE = 'agent-orchestrator/claude-agent:latest'

function credTmpDir(userId: string, agentId: string): string {
  return join(tmpdir(), `ao-creds-${userId}-${agentId}`)
}

export class DockerManager extends EventEmitter {
  private docker: Docker
  private streams = new Map<string, NodeJS.ReadableStream>()
  private containerToAgent = new Map<string, string>()
  private credDirs = new Map<string, string>()
  private agentToUser = new Map<string, string>()

  constructor() {
    super()
    this.docker = new Docker()
  }

  async ensureDockerRunning(onLog: (text: string) => void): Promise<void> {
    if (await this.ping()) return

    const exePath = DOCKER_DESKTOP_PATHS.find((p) => existsSync(p))
    if (!exePath) {
      throw new Error(
        'Docker Desktop nicht gefunden. Bitte installiere Docker Desktop von https://docker.com',
      )
    }

    onLog('Docker Desktop wird gestartet…')
    spawn(exePath, [], { detached: true, stdio: 'ignore' }).unref()

    const deadline = Date.now() + 90_000
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 3000))
      if (await this.ping()) {
        onLog('Docker Desktop ist bereit.')
        return
      }
      onLog('Warte auf Docker Desktop…')
    }

    throw new Error(
      'Docker Desktop konnte nicht gestartet werden. Bitte starte es manuell und versuche es erneut.',
    )
  }

  async buildAgentImage(onLog: (text: string) => void): Promise<void> {
    const contextDir = join(process.cwd(), 'docker', 'agent-image')
    if (!existsSync(contextDir)) {
      throw new Error(`Docker-Build-Kontext nicht gefunden: ${contextDir}`)
    }

    onLog('Agent-Image wird gebaut (einmalig, ~2-5 Minuten)…')

    const tail: string[] = []

    await new Promise<void>((resolve, reject) => {
      const proc = spawn('docker', ['build', '--progress=plain', '-t', AGENT_IMAGE, contextDir], {
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      const handleChunk = (chunk: Buffer) => {
        chunk.toString('utf8').split(/\r?\n/).forEach((line) => {
          if (!line.trim()) return
          onLog(line)
          tail.push(line)
          if (tail.length > 20) tail.shift()
        })
      }
      proc.stdout?.on('data', handleChunk)
      proc.stderr?.on('data', handleChunk)
      proc.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`docker build fehlgeschlagen. Letzte Zeilen:\n${tail.slice(-8).join('\n')}`))
      })
      proc.on('error', (err) =>
        reject(new Error(`docker build konnte nicht gestartet werden: ${err.message}`)),
      )
    })

    onLog('✓ Agent-Image erfolgreich gebaut.')
  }

  async ping(): Promise<boolean> {
    try {
      await this.docker.ping()
      return true
    } catch {
      return false
    }
  }

  async ensureImage(): Promise<boolean> {
    try {
      await this.docker.getImage(AGENT_IMAGE).inspect()
      return true
    } catch {
      return false
    }
  }

  async startAgent(
    userId: string,
    agentId: string,
    name: string,
    systemPrompt: string,
    model: string,
  ): Promise<string> {
    const containerName = `agent-orch-${userId}-${agentId}`
    await this.removeIfExists(containerName)

    const credDir = credTmpDir(userId, agentId)
    mkdirSync(credDir, { recursive: true })
    let credsExtracted = false
    try {
      credsExtracted = await extractCredentialsToDir(userId, credDir)
    } catch {
      // extractCredentialsToDir failed – proceed without credentials only for local userId
    }

    if (!credsExtracted && userId !== 'local') {
      rmSync(credDir, { recursive: true, force: true })
      throw new Error(
        'Keine Claude-Credentials gefunden. Bitte öffne einmalig die Desktop-App und logge dich ein.',
      )
    }

    const binds = [
      `${agentInbox(userId, agentId)}:/data/inbox`,
      `${agentOutbox(userId, agentId)}:/data/outbox`,
      `${agentWorkspace(userId, agentId)}:/data/workspace`,
    ]

    if (credsExtracted) {
      binds.push(`${credDir}:/home/agent/.claude`)
      const claudeJson = join(credDir, '.claude.json')
      if (existsSync(claudeJson)) {
        binds.push(`${claudeJson}:/home/agent/.claude.json:ro`)
      }
    }

    const container = await this.docker.createContainer({
      Image: AGENT_IMAGE,
      name: containerName,
      Tty: false,
      OpenStdin: false,
      Env: [
        `AGENT_ID=${agentId}`,
        `AGENT_NAME=${name}`,
        `AGENT_MODEL=${model}`,
        `AGENT_SYSTEM_PROMPT=${systemPrompt}`,
      ],
      HostConfig: {
        AutoRemove: false,
        Binds: binds,
        NetworkMode: 'bridge',
      },
      WorkingDir: '/data/workspace',
    })

    await container.start()
    this.agentToUser.set(agentId, userId)
    if (credsExtracted) this.credDirs.set(container.id, credDir)
    this.attachLogs(userId, agentId, container)
    return container.id
  }

  async stopAgent(userId: string, containerId: string): Promise<void> {
    try {
      const c = this.docker.getContainer(containerId)
      await c.stop({ t: 5 })
    } catch (err: unknown) {
      const e = err as { statusCode?: number }
      if (e.statusCode !== 304 && e.statusCode !== 404) throw err
    } finally {
      this.cleanupContainer(containerId)
    }
  }

  async removeAgent(userId: string, containerId: string): Promise<void> {
    try {
      const c = this.docker.getContainer(containerId)
      await c.remove({ force: true })
    } catch (err: unknown) {
      const e = err as { statusCode?: number }
      if (e.statusCode !== 404) throw err
    } finally {
      this.cleanupContainer(containerId)
    }
  }

  private cleanupContainer(containerId: string): void {
    const agentKey = this.containerToAgent.get(containerId)
    if (agentKey) {
      const stream = this.streams.get(agentKey)
      if (stream) {
        ;(stream as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.()
        this.streams.delete(agentKey)
      }
      this.containerToAgent.delete(containerId)
    }
    const credDir = this.credDirs.get(containerId)
    if (credDir) {
      try { rmSync(credDir, { recursive: true, force: true }) } catch { /* ignore */ }
      this.credDirs.delete(containerId)
    }
  }

  private async removeIfExists(name: string): Promise<void> {
    try {
      const c = this.docker.getContainer(name)
      await c.remove({ force: true })
    } catch {
      // ignore
    }
  }

  private async attachLogs(
    userId: string,
    agentId: string,
    container: Docker.Container,
  ): Promise<void> {
    const agentKey = `${userId}:${agentId}`
    const stream = await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      tail: 0,
      timestamps: false,
    })
    this.streams.set(agentKey, stream as unknown as NodeJS.ReadableStream)
    this.containerToAgent.set(container.id, agentKey)

    const stdout = new EventEmitter()
    const stderr = new EventEmitter()
    stdout.on('data', (chunk: Buffer) => this.emitLog(agentId, 'stdout', chunk))
    stderr.on('data', (chunk: Buffer) => this.emitLog(agentId, 'stderr', chunk))

    container.modem.demuxStream(
      stream,
      { write: (chunk: Buffer) => stdout.emit('data', chunk) } as unknown as NodeJS.WritableStream,
      { write: (chunk: Buffer) => stderr.emit('data', chunk) } as unknown as NodeJS.WritableStream,
    )

    stream.on('end', () => {
      this.streams.delete(agentKey)
      this.containerToAgent.delete(container.id)
      const line: LogLine = {
        agentId,
        stream: 'system',
        ts: new Date().toISOString(),
        text: '[container stream ended]',
      }
      this.emit('log', { userId, line })
      this.emit('status', { userId, agentId, status: 'stopped' })
      this.agentToUser.delete(agentId)
    })
  }

  private emitLog(agentId: string, kind: 'stdout' | 'stderr', chunk: Buffer): void {
    const text = chunk.toString('utf8')
    const line: LogLine = {
      agentId,
      stream: kind,
      ts: new Date().toISOString(),
      text,
    }
    this.emit('log', { userId: this.agentToUser.get(agentId) ?? 'local', line })
  }

  async inspectStatus(containerId: string): Promise<'running' | 'stopped' | 'unknown'> {
    try {
      const info = await this.docker.getContainer(containerId).inspect()
      if (info.State.Running) return 'running'
      return 'stopped'
    } catch {
      return 'unknown'
    }
  }
}
