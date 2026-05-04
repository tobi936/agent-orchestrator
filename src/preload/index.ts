import { contextBridge, ipcRenderer } from 'electron'
import type {
  Agent,
  AgentMessage,
  LogLine,
  NewAgentInput,
  SendMessageInput,
} from '../shared/types.js'

const api = {
  auth: {
    status: (): Promise<boolean> => ipcRenderer.invoke('auth:status'),
  },
  docker: {
    status: (): Promise<{ reachable: boolean; imageReady: boolean }> =>
      ipcRenderer.invoke('docker:status'),
  },
  agents: {
    list: (): Promise<Agent[]> => ipcRenderer.invoke('agents:list'),
    get: (id: string): Promise<Agent | undefined> => ipcRenderer.invoke('agents:get', id),
    create: (input: NewAgentInput): Promise<Agent> => ipcRenderer.invoke('agents:create', input),
    start: (id: string): Promise<Agent> => ipcRenderer.invoke('agents:start', id),
    stop: (id: string): Promise<Agent> => ipcRenderer.invoke('agents:stop', id),
    delete: (id: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('agents:delete', id),
    logHistory: (id: string): Promise<LogLine[]> => ipcRenderer.invoke('agents:logHistory', id),
  },
  messages: {
    list: (agentId?: string): Promise<AgentMessage[]> =>
      ipcRenderer.invoke('messages:list', agentId),
    send: (input: SendMessageInput): Promise<AgentMessage> =>
      ipcRenderer.invoke('messages:send', input),
  },
  events: {
    onLog: (cb: (line: LogLine) => void) => {
      const handler = (_e: unknown, line: LogLine) => cb(line)
      ipcRenderer.on('agent:log', handler)
      return () => ipcRenderer.off('agent:log', handler)
    },
    onAgentStatus: (cb: (agent: Agent) => void) => {
      const handler = (_e: unknown, agent: Agent) => cb(agent)
      ipcRenderer.on('agent:status', handler)
      return () => ipcRenderer.off('agent:status', handler)
    },
    onMessageDelivered: (cb: (msg: AgentMessage) => void) => {
      const handler = (_e: unknown, msg: AgentMessage) => cb(msg)
      ipcRenderer.on('message:delivered', handler)
      return () => ipcRenderer.off('message:delivered', handler)
    },
    onRoutingError: (
      cb: (err: { fromId: string; filePath: string; reason: string }) => void,
    ) => {
      const handler = (_e: unknown, err: { fromId: string; filePath: string; reason: string }) =>
        cb(err)
      ipcRenderer.on('message:error', handler)
      return () => ipcRenderer.off('message:error', handler)
    },
  },
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
