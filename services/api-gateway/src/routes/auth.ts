import { Router } from 'express'
import bcrypt from 'bcrypt'
import { nanoid } from 'nanoid'
import { pool } from '../db.js'
import { signToken, requireAuth } from '../middleware/auth.js'

export function createAuthRouter(): Router {
  const router = Router()

  router.post('/register', async (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string }
    if (!email || !password || password.length < 8) {
      res.status(400).json({ error: 'Email and password (min 8 chars) required' })
      return
    }
    const hash = await bcrypt.hash(password, 12)
    const id = nanoid(12)
    try {
      await pool.query(
        'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)',
        [id, email.toLowerCase().trim(), hash],
      )
      res.status(201).json({ token: signToken(id, email) })
    } catch (err: any) {
      if (err.code === '23505') {
        res.status(409).json({ error: 'Email already registered' })
      } else {
        res.status(500).json({ error: 'Registration failed' })
      }
    }
  })

  router.post('/login', async (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string }
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' })
      return
    }
    const result = await pool.query(
      'SELECT id, password_hash FROM users WHERE email = $1',
      [email.toLowerCase().trim()],
    )
    const user = result.rows[0]
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }
    res.json({ token: signToken(user.id, email) })
  })

  router.get('/me', requireAuth, async (req, res) => {
    const result = await pool.query(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [req.userId],
    )
    if (!result.rows[0]) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json(result.rows[0])
  })

  return router
}
