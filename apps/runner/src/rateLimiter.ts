import type { Request, Response, NextFunction } from 'express'

const store = new Map<string, { count: number; resetAt: number }>()

let lastEvict = Date.now()
function maybeEvict() {
  const now = Date.now()
  if (now - lastEvict < 5 * 60 * 1000) return
  lastEvict = now
  for (const [k, v] of store) {
    if (now > v.resetAt) store.delete(k)
  }
}

function check(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter?: number } {
  maybeEvict()
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { ok: true }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown'
}

/** General rate limit middleware: 300 req/min for reads, 60 req/min for writes */
export function generalRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req)
  const isWrite = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)
  const result = check(`${isWrite ? 'w' : 'r'}:${ip}`, isWrite ? 60 : 300, 60_000)
  if (!result.ok) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: result.retryAfter })
  }
  next()
}

/** Strict rate limit for expensive operations (start/restart): 10 per hour per IP */
export function expensiveRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req)
  const result = check(`exp:${ip}`, 10, 60 * 60_000)
  if (!result.ok) {
    return res
      .status(429)
      .json({ error: 'Too many operations. Try again later.', retryAfter: result.retryAfter })
  }
  next()
}
