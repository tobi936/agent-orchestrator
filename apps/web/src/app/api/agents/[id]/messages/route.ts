import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// Returns all tasks for an agent with their thread, sorted oldest first
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tasks = await prisma.task.findMany({
    where: { agentId: id },
    orderBy: { createdAt: 'asc' },
    include: {
      thread: { orderBy: { createdAt: 'asc' } },
      fromAgent: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(tasks)
}
