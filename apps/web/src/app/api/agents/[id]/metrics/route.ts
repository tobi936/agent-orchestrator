import { NextResponse } from 'next/server'

const RUNNER_URL = process.env.RUNNER_URL ?? 'http://localhost:3001'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const res = await fetch(`${RUNNER_URL}/agents/${id}/metrics`)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Runner unreachable: ${message}` }, { status: 502 })
  }
}
