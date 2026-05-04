import { Router } from 'express'
import { requireAuth } from './middleware.js'
import { listMessages } from '../agent-store.js'
import { MessageRouter } from '../message-router.js'
import type { SendMessageInput } from '../../shared/types.js'

let msgRouter: MessageRouter | null = null

export function setMessageRouter(r: MessageRouter): void {
  msgRouter = r
}

export function createMessagesRouter(): Router {
  const router = Router()
  router.use(requireAuth)

  router.get('/', async (req, res) => {
    const agentId = req.query.agentId as string | undefined
    res.json(await listMessages(agentId))
  })

  router.post('/', async (req, res) => {
    if (!msgRouter) { res.status(503).json({ error: 'router not available' }); return }
    const msg = await msgRouter.sendMessage(req.body as SendMessageInput)
    res.status(201).json(msg)
  })

  return router
}
