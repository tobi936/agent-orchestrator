import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request) {
  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (typeof body.provider === 'string') data.provider = body.provider
  if (typeof body.model === 'string') data.model = body.model

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const result = await prisma.agent.updateMany({ data })
  return NextResponse.json({ updated: result.count })
}
