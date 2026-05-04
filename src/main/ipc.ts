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
import { readServerConfig, writeServerConfig, clearServerToken } from './server-config.js'
import type { Agent, LogLine, NewAgentInput, SendMessageInput, ServerConfig } from '../shared/types.js'

async function remoteGet(path: string): Promise<unknown> {
  const config = readServerConfig()
  if (!config?.serverUrl || !config.token) throw new Error('no remote server configured')
  const res = await fetch(`${config.serverUrl}${path}`, {
    headers: { Authorization: `Bearer ${config.token}` },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function remotePost(path: string, body: unknown): Promise<unknown> {
  const config = readServerConfig()
  if (!config?.serverUrl || !config.token) throw new Error('no remote server configured')
  const res = await fetch(`${config.serverUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function remoteDelete(path: string): Promise<unknown> {
  const config = readServerConfig()
  if (!config?.serverUrl || !config.token) throw new Error('no remote server configured')
  const res = await fetch(`${config.serverUrl}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${config.token}` },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function isRemote(): boolean {
  const config = readServerConfig()
  if (!config?.serverUrl || !config.token) return false
  try {
    const url = new URL(config.serverUrl)
    return !(url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  } catch {
    return false
  }
}

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
    if (isRemote()) return remoteGet('/api/docker/status')
    return { reachable: await docker.ping(), imageReady: await docker.ensureImage() }
  })

  ipcMain.handle('agents:list', async () => {
    if (isRemote()) return remoteGet('/api/agents')
    return listAgents()
  })

  ipcMain.handle('agents:get', async (_e, id: string) => {
    if (isRemote()) return remoteGet(`/api/agents/${id}`)
    return getAgent(id)
  })

  ipcMain.handle('agents:create', async (_e, input: NewAgentInput) => {
    if (isRemote()) return remotePost('/api/agents', input)
    return createAgent(input)
  })

  ipcMain.handle('agents:logHistory', async (_e, id: string) => {
    if (isRemote()) return remoteGet(`/api/agents/${id}/logs`)
    return logBuffer.history(id)
  })

  ipcMain.handle('agents:start', async (_e, id: string) => {
    if (isRemote()) return remotePost(`/api/agents/${id}/start`, {})
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
      if (!(await docker.ensureImage())) await docker.buildAgentImage(emitLog)
      const containerId = await docker.startAgent(agent.id, agent.name, agent.systemPrompt, agent.model)
      router.watchAgent(agent.id)
      return updateAgent(id, { containerId, status: 'running' })
    } catch (err) {
      await updateAgent(id, { status: 'error', lastError: String(err) })
      throw err
    }
  })

  ipcMain.handle('agents:stop', async (_e, id: string) => {
    if (isRemote()) return remotePost(`/api/agents/${id}/stop`, {})
    const agent = await getAgent(id)
    if (!agent || !agent.containerId) return undefined
    await updateAgent(id, { status: 'stopping' })
    await docker.stopAgent(agent.containerId)
    await router.unwatchAgent(id)
    return updateAgent(id, { status: 'stopped' })
  })

  ipcMain.handle('agents:delete', async (_e, id: string) => {
    if (isRemote()) return remoteDelete(`/api/agents/${id}`)
    const agent = await getAgent(id)
    if (agent?.containerId) {
      try { await docker.removeAgent(agent.containerId) } catch { /* container may be gone */ }
    }
    await router.unwatchAgent(id)
    logBuffer.clear(id)
    await deleteAgent(id)
    return { ok: true }
  })

  ipcMain.handle('messages:list', async (_e, agentId?: string) => {
    if (isRemote()) return remoteGet(agentId ? `/api/messages?agentId=${agentId}` : '/api/messages')
    return listMessages(agentId)
  })

  ipcMain.handle('messages:send', async (_e, input: SendMessageInput) => {
    if (isRemote()) return remotePost('/api/messages', input)
    return router.sendMessage(input)
  })

  ipcMain.handle('server:getConfig', (): ServerConfig | null => readServerConfig())

  ipcMain.handle('server:connect', (_e, payload: { serverUrl: string; token: string; email?: string }) => {
    writeServerConfig({
      serverUrl: payload.serverUrl.replace(/\/$/, ''),
      token: payload.token,
      email: payload.email,
    })
    // Credential auto-upload is triggered in Issue #8
  })

  ipcMain.handle('server:logout', () => clearServerToken())
}
