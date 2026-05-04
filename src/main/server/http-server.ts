import express from 'express'
import { createAuthRouter } from './auth-router.js'
import { requireAuth } from './middleware.js'
import type { Server } from 'node:http'

export function createApp(): express.Express {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET env var is required and must be at least 32 characters')
  }

  const app = express()
  app.use(express.json())

  app.use('/api/auth', createAuthRouter())

  app.use('/api', requireAuth)

  return app
}

export function startHttpServer(port: number): Promise<Server> {
  const app = createApp()
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve(server))
    server.once('error', reject)
  })
}
