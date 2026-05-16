import { NextRequest, NextResponse } from 'next/server'

async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password)
  const buffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
// In-memory store — shared within one Edge Runtime instance.
// Not globally consistent across Vercel edge replicas, but still a strong
// deterrent against individual clients hammering the API.
const rlStore = new Map<string, { count: number; resetAt: number }>()

function rlCheck(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = rlStore.get(key)

  if (!entry || now > entry.resetAt) {
    rlStore.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { ok: true }
}

// Periodically evict expired entries to avoid unbounded memory growth
let lastEvict = Date.now()
function maybeEvict() {
  const now = Date.now()
  if (now - lastEvict < 5 * 60 * 1000) return
  lastEvict = now
  for (const [k, v] of rlStore) {
    if (now > v.resetAt) rlStore.delete(k)
  }
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

// Routes that are expensive (trigger E2B sandbox / AI usage)
function isExpensiveOp(pathname: string, method: string): boolean {
  if (method !== 'POST') return false
  return (
    pathname.endsWith('/start') ||
    pathname.endsWith('/stop') ||
    pathname.endsWith('/restart') ||
    pathname === '/api/setup-department'
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method
  const ip = getIp(request)

  maybeEvict()

  // ── Rate limiting for all API routes ────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    // Expensive sandbox/AI operations: 20 per hour per IP
    if (isExpensiveOp(pathname, method)) {
      const r = rlCheck(`expensive:${ip}`, 20, 60 * 60 * 1000)
      if (!r.ok) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Too many operations, try again later.' },
          { status: 429, headers: { 'Retry-After': String(r.retryAfter) } },
        )
      }
    }

    // Write mutations: 60 per minute per IP
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      const r = rlCheck(`write:${ip}`, 60, 60 * 1000)
      if (!r.ok) {
        return NextResponse.json(
          { error: 'Too many requests. Slow down.' },
          { status: 429, headers: { 'Retry-After': String(r.retryAfter) } },
        )
      }
    } else {
      // Read requests: 600 per minute per IP
      // Generous to accommodate the runner poller (7 agents × 20 req/min ≈ 140 req/min)
      const r = rlCheck(`read:${ip}`, 600, 60 * 1000)
      if (!r.ok) {
        return NextResponse.json(
          { error: 'Too many requests. Slow down.' },
          { status: 429, headers: { 'Retry-After': String(r.retryAfter) } },
        )
      }
    }
  }

  // ── Auth check ───────────────────────────────────────────────────────────────
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  const sitePassword = process.env.SITE_PASSWORD
  if (!sitePassword) {
    return NextResponse.next()
  }

  const token = request.cookies.get('auth_token')?.value
  const expected = await hashPassword(sitePassword)

  if (token !== expected) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
