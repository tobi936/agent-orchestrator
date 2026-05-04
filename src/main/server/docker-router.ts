import { Router } from 'express'
import { requireAuth } from './middleware.js'
import { DockerManager } from '../docker-manager.js'

let docker: DockerManager | null = null

export function setDockerManager(d: DockerManager): void {
  docker = d
}

export function createDockerRouter(): Router {
  const router = Router()
  router.use(requireAuth)

  router.get('/status', async (_req, res) => {
    if (!docker) { res.json({ reachable: false, imageReady: false }); return }
    res.json({
      reachable: await docker.ping(),
      imageReady: await docker.ensureImage(),
    })
  })

  return router
}
