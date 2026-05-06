import { NextResponse } from 'next/server'

const RUNNER_URL = process.env.RUNNER_URL ?? 'http://localhost:3001'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await fetch(`${RUNNER_URL}/agents/${id}/start`, { method: 'POST' })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
