import { Router } from 'express'
import { requireAuth } from './middleware.js'
import { DockerManager } from '../docker-manager.js'

let docker: DockerManager | null = null
let building = false

export function setDockerManager(d: DockerManager): void {
  docker = d
}

export function triggerImageBuild(onLog?: (t: string) => void): void {
  if (!docker || building) return
  building = true
  docker.buildAgentImage(onLog ?? ((t) => console.log('[docker-build]', t)))
    .catch((err) => console.error('[docker-build] failed:', err))
    .finally(() => { building = false })
}

export function createDockerRouter(): Router {
  const router = Router()
  router.use(requireAuth)

  router.get('/status', async (_req, res) => {
    if (!docker) { res.json({ reachable: false, imageReady: false, building: false }); return }
    res.json({
      reachable: await docker.ping(),
      imageReady: await docker.ensureImage(),
      building,
    })
  })

  router.post('/build', async (_req, res) => {
    if (!docker) { res.status(503).json({ error: 'docker not available' }); return }
    if (building) { res.json({ building: true }); return }
    const reachable = await docker.ping()
    if (!reachable) { res.status(503).json({ error: 'docker not reachable' }); return }
    triggerImageBuild()
    res.json({ building: true })
  })

  return router
}
