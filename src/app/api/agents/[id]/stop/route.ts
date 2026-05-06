import { prisma } from '@/lib/db'
import { stopAgentContainer } from '@/lib/docker'
import { NextResponse } from 'next/server'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const agent = await prisma.agent.findUnique({ where: { id } })
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (agent.status === 'STOPPED') {
    return NextResponse.json({ error: 'Already stopped' }, { status: 409 })
  }

  if (agent.containerId) await stopAgentContainer(agent.containerId)

  const updated = await prisma.agent.update({
    where: { id },
    data: { status: 'STOPPED', containerId: null },
  })

  return NextResponse.json(updated)
}
