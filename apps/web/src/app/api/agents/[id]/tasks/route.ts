import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// All tasks for an agent (inbox = received, outbox = sent by this agent)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const direction = searchParams.get('direction') // 'inbox' | 'outbox'

  if (direction === 'outbox') {
    const tasks = await prisma.task.findMany({
      where: { fromAgentId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { id: true, name: true } },
        thread: { orderBy: { createdAt: 'asc' } },
      },
    })
    return NextResponse.json(tasks)
  }

  const tasks = await prisma.task.findMany({
    where: { agentId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      fromAgent: { select: { id: true, name: true } },
      thread: { orderBy: { createdAt: 'asc' } },
    },
  })
  return NextResponse.json(tasks)
}
