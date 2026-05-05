import Docker from 'dockerode'
import { appendLog } from './db.js'
import { broadcastEvent } from './events.js'
import type { Agent } from '../../shared/types.js'

const AGENT_IMAGE = process.env.AGENT_IMAGE ?? 'agent-orchestrator/agent:latest'

export class DockerRunner {
  private docker = new Docker({ socketPath: process.env.DOCKER_SOCKET ?? '/var/run/docker.sock' })

  async startAgent(userId: string, agent: Agent): Promise<string> {
    const container = await this.docker.createContainer({
      Image: AGENT_IMAGE,
      name: `agent-${agent.id}`,
      Env: [
        `AGENT_ID=${agent.id}`,
        `AGENT_NAME=${agent.name}`,
        `USER_ID=${userId}`,
        `PROVIDER=${agent.provider}`,
        `PROVIDER_URL=${agent.providerUrl ?? ''}`,
        `MODEL=${agent.model}`,
        `SYSTEM_PROMPT=${agent.systemPrompt}`,
        `ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY ?? ''}`,
        `MESSAGE_SERVICE_URL=${process.env.MESSAGE_SERVICE_URL ?? 'http://message-service:3002'}`,
        `INTERNAL_SECRET=${process.env.INTERNAL_SECRET ?? ''}`,
      ],
      HostConfig: {
        AutoRemove: false,
        NetworkMode: process.env.DOCKER_NETWORK ?? 'agent-net',
      },
    })

    await container.start()
    this.streamLogs(userId, agent.id, container)
    return container.id
  }

  async stopAgent(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId)
    await container.stop({ t: 10 }).catch(() => { /* already stopped */ })
  }

  async removeAgent(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId)
    await container.remove({ force: true }).catch(() => { /* already gone */ })
  }

  private streamLogs(userId: string, agentId: string, container: Docker.Container): void {
    container.logs({ follow: true, stdout: true, stderr: true }, (err, stream) => {
      if (err || !stream) return
      stream.on('data', async (chunk: Buffer) => {
        // Docker multiplexed stream: first 8 bytes are header
        const text = chunk.slice(8).toString('utf8').trimEnd()
        if (!text) return
        const streamType = chunk[0] === 2 ? 'stderr' : 'stdout'
        await appendLog(userId, agentId, streamType as 'stdout' | 'stderr', text)
        broadcastEvent(userId, 'agent:log', { agentId, stream: streamType, text, ts: new Date().toISOString() })
      })
      stream.on('end', async () => {
        await appendLog(userId, agentId, 'system', 'Container stopped')
        broadcastEvent(userId, 'agent:status', { id: agentId, status: 'stopped', userId })
      })
    })
  }
}
