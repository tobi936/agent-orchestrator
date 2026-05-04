import { Router } from 'express'
import { requireAuth } from './middleware.js'
import {
  listAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
} from '../agent-store.js'
import { DockerManager } from '../docker-manager.js'
import { MessageRouter } from '../message-router.js'
import * as logBuffer from '../log-buffer.js'
import type { NewAgentInput } from '../../shared/types.js'

let docker: DockerManager | null = null
let router_: MessageRouter | null = null

export function setManagers(d: DockerManager, r: MessageRouter): void {
  docker = d
  router_ = r
}

export function createAgentsRouter(): Router {
  const router = Router()
  router.use(requireAuth)

  router.get('/', async (_req, res) => {
    res.json(await listAgents())
  })

  router.get('/:id', async (req, res) => {
    const agent = await getAgent(req.params.id)
    if (!agent) { res.status(404).json({ error: 'not found' }); return }
    res.json(agent)
  })

  router.post('/', async (req, res) => {
    const agent = await createAgent(req.body as NewAgentInput)
    res.status(201).json(agent)
  })

  router.get('/:id/logs', async (req, res) => {
    res.json(logBuffer.history(req.params.id))
  })

  router.post('/:id/start', async (req, res) => {
    if (!docker || !router_) { res.status(503).json({ error: 'docker not available' }); return }
    const agent = await getAgent(req.params.id)
    if (!agent) { res.status(404).json({ error: 'not found' }); return }
    await updateAgent(agent.id, { status: 'starting', lastError: undefined })
    try {
      await docker.ensureDockerRunning(() => undefined)
      if (!(await docker.ensureImage())) await docker.buildAgentImage(() => undefined)
      const containerId = await docker.startAgent(agent.id, agent.name, agent.systemPrompt, agent.model)
      router_!.watchAgent(agent.id)
      res.json(await updateAgent(agent.id, { containerId, status: 'running' }))
    } catch (err) {
      await updateAgent(agent.id, { status: 'error', lastError: String(err) })
      res.status(500).json({ error: String(err) })
    }
  })

  router.post('/:id/stop', async (req, res) => {
    if (!docker || !router_) { res.status(503).json({ error: 'docker not available' }); return }
    const agent = await getAgent(req.params.id)
    if (!agent?.containerId) { res.status(404).json({ error: 'not found' }); return }
    await updateAgent(agent.id, { status: 'stopping' })
    await docker.stopAgent(agent.containerId)
    await router_!.unwatchAgent(agent.id)
    res.json(await updateAgent(agent.id, { status: 'stopped' }))
  })

  router.delete('/:id', async (req, res) => {
    if (!docker || !router_) { res.status(503).json({ error: 'docker not available' }); return }
    const agent = await getAgent(req.params.id)
    if (agent?.containerId) {
      try { await docker.removeAgent(agent.containerId) } catch { /* container may be gone */ }
    }
    await router_!.unwatchAgent(req.params.id)
    logBuffer.clear(req.params.id)
    await deleteAgent(req.params.id)
    res.json({ ok: true })
  })

  return router
}
