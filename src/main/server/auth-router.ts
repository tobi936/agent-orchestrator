import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { createUser, findUserByEmail, findUserById } from './user-store.js'
import { requireAuth } from './middleware.js'

const SALT_ROUNDS = 12
const JWT_EXPIRY = '30d'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function createAuthRouter(): Router {
  const router = Router()

  router.post('/register', async (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string }
    if (!email || !EMAIL_RE.test(email)) {
      res.status(400).json({ error: 'invalid email' })
      return
    }
    if (!password || password.length < 8) {
      res.status(400).json({ error: 'password must be at least 8 characters' })
      return
    }
    const existing = await findUserByEmail(email)
    if (existing) {
      res.status(409).json({ error: 'email already in use' })
      return
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const user = await createUser(email, passwordHash)
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: JWT_EXPIRY },
    )
    res.status(201).json({ token, user: { id: user.id, email: user.email, createdAt: user.createdAt } })
  })

  router.post('/login', async (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string }
    if (!email || !password) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }
    const user = await findUserByEmail(email)
    if (!user) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }
    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: JWT_EXPIRY },
    )
    res.json({ token, user: { id: user.id, email: user.email, createdAt: user.createdAt } })
  })

  router.get('/me', requireAuth, async (req, res) => {
    const user = await findUserById(req.userId)
    if (!user) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }
    res.json({ id: user.id, email: user.email, createdAt: user.createdAt })
  })

  return router
}
