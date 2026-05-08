import { NextResponse } from 'next/server'

export async function GET() {
  const runnerUrl = process.env.RUNNER_URL ?? 'http://localhost:3001'
  try {
    const res = await fetch(`${runnerUrl}/ollama-keys`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Runner unavailable' }, { status: 502 })
  }
}
