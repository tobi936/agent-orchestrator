import { Router } from 'express'
import { nanoid } from 'nanoid'
import {
  listAgents, getAgent, createAgent, updateAgent, deleteAgent, getLogs,
} from '../db.js'
import { DockerRunner } from '../docker-runner.js'
import { broadcastEvent } from '../events.js'
import type { Provider } from '../providers/types.js'

export function createAgentsRouter(docker: DockerRunner): Router {
  const router = Router()

  // x-user-id injected by API Gateway after JWT verification
  function userId(req: any): string { return req.headers['x-user-id'] as string }

  router.get('/', async (req, res) => {
    res.json(await listAgents(userId(req)))
  })

  router.get('/:id', async (req, res) => {
    const agent = await getAgent(userId(req), req.params.id)
    if (!agent) { res.status(404).json({ error: 'not found' }); return }
    res.json(agent)
  })

  router.post('/', async (req, res) => {
    const { name, systemPrompt, model, provider, providerUrl } = req.body as {
      name?: string
      systemPrompt?: string
      model?: string
      provider?: Provider
      providerUrl?: string
    }
    if (!name || !systemPrompt) {
      res.status(400).json({ error: 'name and systemPrompt required' })
      return
    }
    const id = nanoid(10)
    const agent = await createAgent(userId(req), {
      id,
      name: name.trim(),
      systemPrompt,
      model: model || 'claude-sonnet-4-6',
      provider: provider || 'claude',
      providerUrl,
    })
    res.status(201).json(agent)
  })

  router.post('/:id/start', async (req, res) => {
    const uid = userId(req)
    const agent = await getAgent(uid, req.params.id)
    if (!agent) { res.status(404).json({ error: 'not found' }); return }

    await updateAgent(uid, agent.id, { status: 'starting', lastError: undefined })
    broadcastEvent(uid, 'agent:status', { ...agent, status: 'starting' })

    try {
      const containerId = await docker.startAgent(uid, agent)
      const updated = await updateAgent(uid, agent.id, { containerId, status: 'running' })
      broadcastEvent(uid, 'agent:status', updated)
      res.json(updated)
    } catch (err) {
      const updated = await updateAgent(uid, agent.id, { status: 'error', lastError: String(err) })
      broadcastEvent(uid, 'agent:status', updated)
      res.status(500).json({ error: String(err) })
    }
  })

  router.post('/:id/stop', async (req, res) => {
    const uid = userId(req)
    const agent = await getAgent(uid, req.params.id)
    if (!agent?.containerId) { res.status(404).json({ error: 'not found or not running' }); return }

    await updateAgent(uid, agent.id, { status: 'stopping' })
    broadcastEvent(uid, 'agent:status', { ...agent, status: 'stopping' })

    await docker.stopAgent(agent.containerId)
    const updated = await updateAgent(uid, agent.id, { status: 'stopped', containerId: undefined })
    broadcastEvent(uid, 'agent:status', updated)
    res.json(updated)
  })

  router.delete('/:id', async (req, res) => {
    const uid = userId(req)
    const agent = await getAgent(uid, req.params.id)
    if (agent?.containerId) {
      try { await docker.removeAgent(agent.containerId) } catch { /* already gone */ }
    }
    await deleteAgent(uid, req.params.id)
    broadcastEvent(uid, 'agent:deleted', { id: req.params.id })
    res.json({ ok: true })
  })

  router.get('/:id/logs', async (req, res) => {
    const limit = Number(req.query.limit ?? 500)
    res.json(await getLogs(userId(req), req.params.id, limit))
  })

  return router
}
