import Docker from 'dockerode'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { EventEmitter } from 'node:events'
import { agentInbox, agentOutbox, agentWorkspace } from './paths.js'
import type { LogLine } from '../shared/types.js'

const DOCKER_DESKTOP_PATHS = [
  'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
  'C:\\Program Files (x86)\\Docker\\Docker\\Docker Desktop.exe',
]

export const AGENT_IMAGE = 'agent-orchestrator/claude-agent:latest'

export class DockerManager extends EventEmitter {
  private docker: Docker
  private streams = new Map<string, NodeJS.ReadableStream>()
  private containerToAgent = new Map<string, string>()

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
    const contextDir = (() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const electron = require('electron') as { app: { getAppPath(): string } }
        return join(electron.app.getAppPath(), 'docker', 'agent-image')
      } catch {
        return join(process.cwd(), 'docker', 'agent-image')
      }
    })()
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

  async startAgent(agentId: string, name: string, systemPrompt: string, model: string): Promise<string> {
    const containerName = `agent-orch-${agentId}`
    await this.removeIfExists(containerName)

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
        Binds: [
          `${agentInbox(agentId)}:/data/inbox`,
          `${agentOutbox(agentId)}:/data/outbox`,
          `${agentWorkspace(agentId)}:/data/workspace`,
          `${homedir()}/.claude:/home/agent/.claude`,
          `${homedir()}/.claude.json:/home/agent/.claude.json:ro`,
        ],
        NetworkMode: 'bridge',
      },
      WorkingDir: '/data/workspace',
    })

    await container.start()
    this.attachLogs(agentId, container)
    return container.id
  }

  async stopAgent(containerId: string): Promise<void> {
    try {
      const c = this.docker.getContainer(containerId)
      await c.stop({ t: 5 })
    } catch (err: unknown) {
      const e = err as { statusCode?: number }
      if (e.statusCode !== 304 && e.statusCode !== 404) throw err
    } finally {
      // Cleanup stream to prevent duplicate listeners on restart
      const agentId = this.containerToAgent.get(containerId)
      if (agentId) {
        const stream = this.streams.get(agentId)
        if (stream) {
          stream.destroy()
          this.streams.delete(agentId)
        }
        this.containerToAgent.delete(containerId)
      }
    }
  }

  async removeAgent(containerId: string): Promise<void> {
    try {
      const c = this.docker.getContainer(containerId)
      await c.remove({ force: true })
    } catch (err: unknown) {
      const e = err as { statusCode?: number }
      if (e.statusCode !== 404) throw err
    } finally {
      const agentId = this.containerToAgent.get(containerId)
      if (agentId) {
        const stream = this.streams.get(agentId)
        if (stream) {
          stream.destroy()
          this.streams.delete(agentId)
        }
        this.containerToAgent.delete(containerId)
      }
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

  private async attachLogs(agentId: string, container: Docker.Container): Promise<void> {
    const stream = await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      tail: 0,
      timestamps: false,
    })
    this.streams.set(agentId, stream as unknown as NodeJS.ReadableStream)
    this.containerToAgent.set(container.id, agentId)

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
      this.streams.delete(agentId)
      this.containerToAgent.delete(container.id)
      const line: LogLine = {
        agentId,
        stream: 'system',
        ts: new Date().toISOString(),
        text: '[container stream ended]',
      }
      this.emit('log', line)
      this.emit('status', { agentId, status: 'stopped' })
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
    this.emit('log', line)
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
