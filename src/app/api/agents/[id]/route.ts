import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const agent = await prisma.agent.findUnique({ where: { id } })
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(agent)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.agent.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
