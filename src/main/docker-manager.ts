import Docker from 'dockerode'
import { homedir } from 'node:os'
import { EventEmitter } from 'node:events'
import { agentInbox, agentOutbox, agentWorkspace } from './paths.js'
import type { LogLine } from '../shared/types.js'

export const AGENT_IMAGE = 'agent-orchestrator/claude-agent:latest'

export class DockerManager extends EventEmitter {
  private docker: Docker
  private streams = new Map<string, NodeJS.ReadableStream>()

  constructor() {
    super()
    this.docker = new Docker()
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
    }
  }

  async removeAgent(containerId: string): Promise<void> {
    try {
      const c = this.docker.getContainer(containerId)
      await c.remove({ force: true })
    } catch (err: unknown) {
      const e = err as { statusCode?: number }
      if (e.statusCode !== 404) throw err
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
      const line: LogLine = {
        agentId,
        stream: 'system',
        ts: new Date().toISOString(),
        text: '[container stream ended]',
      }
      this.emit('log', line)
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
