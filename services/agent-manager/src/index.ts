import express from 'express'
import { createServer } from 'node:http'
import { DockerRunner } from './docker-runner.js'
import { createAgentsRouter } from './routes/agents.js'

const PORT = Number(process.env.PORT ?? 3001)

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required')

const docker = new DockerRunner()
const app = express()
app.use(express.json({ limit: '20mb' }))

app.use('/api/agents', createAgentsRouter(docker))

app.get('/healthz', (_req, res) => res.json({ ok: true }))

const server = createServer(app)
server.listen(PORT, () => console.log(`Agent Manager → http://localhost:${PORT}`))
process.on('SIGTERM', () => server.close())
