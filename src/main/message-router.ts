import chokidar, { type FSWatcher } from 'chokidar'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { nanoid } from 'nanoid'
import { EventEmitter } from 'node:events'
import { addMessage, findAgentByName, getAgent, listAgents, updateMessage } from './agent-store.js'
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
    const agents = await listAgents()
    for (const a of agents) this.watchAgent(a.id)
  }

  watchAgent(agentId: string): void {
    if (this.watchers.has(agentId)) return
    const dir = agentOutbox(agentId)
    const watcher = chokidar.watch(dir, {
      ignoreInitial: true,
      persistent: true,
      depth: 0,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    })
    watcher.on('add', (filePath) => {
      void this.handleOutboxFile(agentId, filePath)
    })
    this.watchers.set(agentId, watcher)
  }

  async unwatchAgent(agentId: string): Promise<void> {
    const w = this.watchers.get(agentId)
    if (w) {
      await w.close()
      this.watchers.delete(agentId)
    }
  }

  async stop(): Promise<void> {
    await Promise.all([...this.watchers.values()].map((w) => w.close()))
    this.watchers.clear()
  }

  async sendMessage(input: SendMessageInput): Promise<AgentMessage> {
    const target = await getAgent(input.to)
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
    await addMessage(msg)
    const inboxFile = join(agentInbox(input.to), `${msg.createdAt.replace(/[:.]/g, '-')}-${id}.json`)
    await writeFile(inboxFile, JSON.stringify(msg, null, 2), 'utf8')
    await updateMessage(id, { status: 'delivered' })
    this.emit('message', { ...msg, status: 'delivered' })
    return msg
  }

  private async handleOutboxFile(fromId: string, filePath: string): Promise<void> {
    if (!filePath.endsWith('.json')) return
    try {
      const raw = await readFile(filePath, 'utf8')
      const parsed = JSON.parse(raw) as OutboxFile
      const target = await this.resolveTarget(parsed.to)
      if (!target) {
        const errPath = filePath.replace(/\.json$/, '.error.json')
        await rename(filePath, errPath)
        this.emit('routing-error', { fromId, filePath, reason: `Target '${parsed.to}' not found` })
        return
      }
      await this.sendMessage({
        from: fromId,
        to: target.id,
        subject: parsed.subject,
        body: parsed.body,
      })
      const processedPath = filePath.replace(/\.json$/, '.sent.json')
      await rename(filePath, processedPath)
    } catch (err) {
      this.emit('routing-error', { fromId, filePath, reason: String(err) })
    }
  }

  private async resolveTarget(idOrName: string) {
    const byId = await getAgent(idOrName)
    if (byId) return byId
    return findAgentByName(idOrName)
  }
}
