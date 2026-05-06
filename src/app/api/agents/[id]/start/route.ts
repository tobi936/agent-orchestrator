import { prisma } from '@/lib/db'
import { startAgentContainer } from '@/lib/docker'
import { NextResponse } from 'next/server'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const agent = await prisma.agent.findUnique({ where: { id } })
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (agent.status === 'RUNNING') {
    return NextResponse.json({ error: 'Already running' }, { status: 409 })
  }

  const containerId = await startAgentContainer(id, agent.systemPrompt)
  const updated = await prisma.agent.update({
    where: { id },
    data: { status: 'RUNNING', containerId },
  })

  return NextResponse.json(updated)
}
