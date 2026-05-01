import { BrowserWindow, ipcMain } from 'electron'
import { nanoid } from 'nanoid'
import {
  addMessage,
  createAgent,
  deleteAgent,
  getAgent,
  listAgents,
  listMessages,
  updateAgent,
  updateMessage,
} from './agent-store.js'
import { DockerManager } from './docker-manager.js'
import { RemoteManager } from './remote-manager.js'
import { MessageRouter } from './message-router.js'
import * as logBuffer from './log-buffer.js'
import type { Agent, AgentMessage, LogLine, NewAgentInput, SendMessageInput } from '../shared/types.js'

export function registerIpc(
  win: BrowserWindow,
  docker: DockerManager,
  router: MessageRouter,
): void {
  const remote = new RemoteManager()

  const send = (channel: string, payload: unknown) => {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }

  docker.on('log', (line: LogLine) => {
    logBuffer.append(line)
    send('agent:log', line)
  })
  docker.on('status', (payload: { agentId: string; status: Agent['status'] }) => {
    void updateAgent(payload.agentId, { status: payload.status }).then((updated) => {
      if (updated) send('agent:status', updated)
    })
  })

  remote.on('log', (line: LogLine) => {
    logBuffer.append(line)
    send('agent:log', line)
  })
  remote.on('status', (payload: { agentId: string; status: Agent['status'] }) => {
    void updateAgent(payload.agentId, { status: payload.status }).then((updated) => {
      if (updated) send('agent:status', updated)
    })
  })

  router.on('message', (msg) => send('message:delivered', msg))
  router.on('routing-error', (err) => send('message:error', err))

  ipcMain.handle('docker:status', async () => {
    return {
      reachable: await docker.ping(),
      imageReady: await docker.ensureImage(),
    }
  })

  ipcMain.handle('agents:list', async () => listAgents())
  ipcMain.handle('agents:get', async (_e, id: string) => getAgent(id))
  ipcMain.handle('agents:create', async (_e, input: NewAgentInput) => createAgent(input))
  ipcMain.handle('agents:logHistory', async (_e, id: string) => logBuffer.history(id))

  ipcMain.handle('agents:start', async (_e, id: string) => {
    const agent = await getAgent(id)
    if (!agent) throw new Error(`Agent ${id} not found`)
    await updateAgent(id, { status: 'starting', lastError: undefined })

    const emitLog = (text: string) => {
      const line: LogLine = { agentId: id, stream: 'system', ts: new Date().toISOString(), text }
      logBuffer.append(line)
      send('agent:log', line)
    }

    if (agent.executionMode === 'remote') {
      emitLog('[SESSION_START]')
      const updated = await updateAgent(id, { status: 'idle' })
      return updated
    }

    try {
      await docker.ensureDockerRunning(emitLog)
      if (!(await docker.ensureImage())) {
        await docker.buildAgentImage(emitLog)
      }
      const containerId = await docker.startAgent(
        agent.id,
        agent.name,
        agent.systemPrompt,
        agent.model,
      )
      router.watchAgent(agent.id)
      const updated = await updateAgent(id, { containerId, status: 'running' })
      return updated
    } catch (err) {
      await updateAgent(id, { status: 'error', lastError: String(err) })
      throw err
    }
  })

  ipcMain.handle('agents:stop', async (_e, id: string) => {
    const agent = await getAgent(id)
    if (!agent) return undefined

    if (agent.executionMode === 'remote') {
      remote.stopTask(id)
      return updateAgent(id, { status: 'stopped' })
    }

    if (!agent.containerId) return undefined
    await updateAgent(id, { status: 'stopping' })
    await docker.stopAgent(agent.containerId)
    await router.unwatchAgent(id)
    return updateAgent(id, { status: 'stopped' })
  })

  ipcMain.handle('agents:delete', async (_e, id: string) => {
    const agent = await getAgent(id)

    if (agent?.executionMode === 'remote') {
      remote.stopTask(id)
    } else if (agent?.containerId) {
      try {
        await docker.removeAgent(agent.containerId)
      } catch {
        // ignore – container might already be gone
      }
    }

    await router.unwatchAgent(id)
    logBuffer.clear(id)
    await deleteAgent(id)
    return { ok: true }
  })

  ipcMain.handle('messages:list', async (_e, agentId?: string) => listMessages(agentId))

  ipcMain.handle('messages:send', async (_e, input: SendMessageInput) => {
    const target = await getAgent(input.to)

    if (target?.executionMode === 'remote') {
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
      await updateMessage(id, { status: 'delivered' })
      send('message:delivered', { ...msg, status: 'delivered' })

      const fromLine = input.from ? `From: ${input.from}\n` : ''
      const subjectLine = input.subject ? `Subject: ${input.subject}\n\n` : ''
      const prompt = `${fromLine}${subjectLine}${input.body}`

      remote.runTask(target.id, prompt, target.systemPrompt).then(async () => {
        await updateMessage(id, { status: 'processed' })
      }).catch(async (err: Error) => {
        await updateMessage(id, { status: 'error' })
        const line: LogLine = {
          agentId: target.id,
          stream: 'system',
          ts: new Date().toISOString(),
          text: `[remote error] ${err.message}`,
        }
        logBuffer.append(line)
        send('agent:log', line)
      })

      return { ...msg, status: 'delivered' }
    }

    return router.sendMessage(input)
  })
}
