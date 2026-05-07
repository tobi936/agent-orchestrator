import { NextRequest, NextResponse } from 'next/server'

// Middleware runs on the Edge Runtime — use Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password)
  const buffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  const sitePassword = process.env.SITE_PASSWORD
  if (!sitePassword) {
    // No password configured — allow all
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
