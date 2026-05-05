import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthPayload {
  sub: string
  email: string
}

declare global {
  namespace Express {
    interface Request {
      userId: string
      userEmail: string
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload
    req.userId = payload.sub
    req.userEmail = payload.email
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export function signToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email } satisfies AuthPayload, process.env.JWT_SECRET!, {
    expiresIn: '7d',
  })
}
