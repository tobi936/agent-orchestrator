import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { getAgent, updateAgent } from '../agent-store.js'
import type { DockerManager } from '../docker-manager.js'
import type { MessageRouter } from '../message-router.js'
import type { Agent, AgentMessage, LogLine } from '../../shared/types.js'
import type { AuthPayload } from './middleware.js'

let dockerInstance: DockerManager | null = null
let msgRouterInstance: MessageRouter | null = null

export function setEventManagers(d: DockerManager, r: MessageRouter): void {
  dockerInstance = d
  msgRouterInstance = r
}

export function createEventsRouter(): Router {
  const router = Router()

  router.get('/', (req, res) => {
    const token = req.query.token as string | undefined
    if (!token) { res.status(401).end(); return }

    let userId: string
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload
      userId = payload.sub
    } catch {
      res.status(401).end()
      return
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    }

    const onLog = ({ userId: uid, line }: { userId: string; line: LogLine }) => {
      if (uid === userId) send('agent:log', line)
    }

    const onStatus = ({ userId: uid, agentId, status }: { userId: string; agentId: string; status: Agent['status'] }) => {
      if (uid !== userId) return
      void updateAgent(uid, agentId, { status }).then((updated) => {
        if (updated) send('agent:status', updated)
      })
    }

    const onMessage = ({ userId: uid, message }: { userId: string; message: AgentMessage }) => {
      if (uid === userId) send('message:delivered', message)
    }

    const onRoutingError = ({ userId: uid, fromId, filePath, reason }: { userId: string; fromId: string; filePath: string; reason: string }) => {
      if (uid === userId) send('message:error', { fromId, filePath, reason })
    }

    dockerInstance?.on('log', onLog)
    dockerInstance?.on('status', onStatus)
    msgRouterInstance?.on('message', onMessage)
    msgRouterInstance?.on('routing-error', onRoutingError)

    req.on('close', () => {
      dockerInstance?.off('log', onLog)
      dockerInstance?.off('status', onStatus)
      msgRouterInstance?.off('message', onMessage)
      msgRouterInstance?.off('routing-error', onRoutingError)
    })
  })

  return router
}
