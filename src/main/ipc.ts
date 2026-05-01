import { BrowserWindow, ipcMain } from 'electron'
import {
  createAgent,
  deleteAgent,
  getAgent,
  listAgents,
  listMessages,
  updateAgent,
} from './agent-store.js'
import { DockerManager } from './docker-manager.js'
import { MessageRouter } from './message-router.js'
import * as logBuffer from './log-buffer.js'
import type { Agent, LogLine, NewAgentInput, SendMessageInput } from '../shared/types.js'

export function registerIpc(
  win: BrowserWindow,
  docker: DockerManager,
  router: MessageRouter,
): void {
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
    if (!agent || !agent.containerId) return undefined
    await updateAgent(id, { status: 'stopping' })
    await docker.stopAgent(agent.containerId)
    await router.unwatchAgent(id)
    return updateAgent(id, { status: 'stopped' })
  })

  ipcMain.handle('agents:delete', async (_e, id: string) => {
    const agent = await getAgent(id)
    if (agent?.containerId) {
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
  ipcMain.handle('messages:send', async (_e, input: SendMessageInput) => router.sendMessage(input))
}
