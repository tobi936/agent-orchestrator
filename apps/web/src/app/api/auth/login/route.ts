import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

// In-memory rate limit store: IP → { count, resetAt }
const attempts = new Map<string, { count: number; resetAt: number }>()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const now = Date.now()

  let entry = attempts.get(ip)
  if (entry && now > entry.resetAt) {
    attempts.delete(ip)
    entry = undefined
  }

  if (entry && entry.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  const { password } = await req.json().catch(() => ({ password: '' }))
  const sitePassword = process.env.SITE_PASSWORD

  if (!sitePassword) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const isValid = password === sitePassword

  if (!isValid) {
    const current = entry ?? { count: 0, resetAt: now + WINDOW_MS }
    current.count += 1
    attempts.set(ip, current)
    const remaining = MAX_ATTEMPTS - current.count
    return NextResponse.json(
      { error: 'Wrong password', remaining },
      { status: 401 }
    )
  }

  // Clear rate limit on success
  attempts.delete(ip)

  const tokenHash = createHash('sha256').update(sitePassword).digest('hex')
  const response = NextResponse.json({ ok: true })
  response.cookies.set('auth_token', tokenHash, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // secure in production
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  return response
}
