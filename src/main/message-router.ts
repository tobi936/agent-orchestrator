import chokidar, { type FSWatcher } from 'chokidar'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { nanoid } from 'nanoid'
import { EventEmitter } from 'node:events'
import { addMessage, findAgentByName, getAgent, updateMessage } from './agent-store.js'
import { agentInbox, agentOutbox } from './paths.js'
import type { AgentMessage, SendMessageInput } from '../shared/types.js'

interface OutboxFile {
  to: string
  subject?: string
  body: string
  inReplyTo?: string
}

export class MessageRouter extends EventEmitter {
  private watchers = new Map<string, FSWatcher>()

  async start(): Promise<void> {
    // Agents are watched explicitly via watchAgent when started via the API.
  }

  watchAgent(userId: string, agentId: string): void {
    const k = `${userId}:${agentId}`
    if (this.watchers.has(k)) return
    const dir = agentOutbox(userId, agentId)
    const watcher = chokidar.watch(dir, {
      ignoreInitial: true,
      persistent: true,
      depth: 0,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    })
    watcher.on('add', (filePath) => {
      void this.handleOutboxFile(userId, agentId, filePath)
    })
    this.watchers.set(k, watcher)
  }

  async unwatchAgent(userId: string, agentId: string): Promise<void> {
    const k = `${userId}:${agentId}`
    const w = this.watchers.get(k)
    if (w) {
      await w.close()
      this.watchers.delete(k)
    }
  }

  async stop(): Promise<void> {
    await Promise.all([...this.watchers.values()].map((w) => w.close()))
    this.watchers.clear()
  }

  async sendMessage(userId: string, input: SendMessageInput): Promise<AgentMessage> {
    const target = await getAgent(userId, input.to)
    if (!target) throw new Error(`Target agent ${input.to} not found`)
    const id = nanoid(12)
    const msg: AgentMessage = {
      id,
      from: input.from,
      to: input.to,
      subject: input.subject,
      body: input.body,
      createdAt: new Date().toISOString(),
      status: 'queued',
    }
    await addMessage(userId, msg)
    const inboxFile = join(
      agentInbox(userId, input.to),
      `${msg.createdAt.replace(/[:.]/g, '-')}-${id}.json`,
    )
    await writeFile(inboxFile, JSON.stringify(msg, null, 2), 'utf8')
    await updateMessage(userId, id, { status: 'delivered' })
    this.emit('message', { userId, message: { ...msg, status: 'delivered' } })
    return msg
  }

  private async handleOutboxFile(
    userId: string,
    fromId: string,
    filePath: string,
  ): Promise<void> {
    if (!filePath.endsWith('.json')) return
    try {
      const raw = await readFile(filePath, 'utf8')
      const parsed = JSON.parse(raw) as OutboxFile
      const target = await this.resolveTarget(userId, parsed.to)
      if (!target) {
        const errPath = filePath.replace(/\.json$/, '.error.json')
        await rename(filePath, errPath)
        this.emit('routing-error', { userId, fromId, filePath, reason: `Target '${parsed.to}' not found` })
        return
      }
      await this.sendMessage(userId, {
        from: fromId,
        to: target.id,
        subject: parsed.subject,
        body: parsed.body,
      })
      const processedPath = filePath.replace(/\.json$/, '.sent.json')
      await rename(filePath, processedPath)
    } catch (err) {
      this.emit('routing-error', { userId, fromId, filePath, reason: String(err) })
    }
  }

  private async resolveTarget(userId: string, idOrName: string) {
    const byId = await getAgent(userId, idOrName)
    if (byId) return byId
    return findAgentByName(userId, idOrName)
  }
}
