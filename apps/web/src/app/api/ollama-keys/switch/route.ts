import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const runnerUrl = process.env.RUNNER_URL ?? 'http://localhost:3001'
  try {
    const body = await req.json().catch(() => ({}))
    const res = await fetch(`${runnerUrl}/ollama-keys/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Runner unavailable' }, { status: 502 })
  }
}
