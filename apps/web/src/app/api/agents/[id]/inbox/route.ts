import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// Runner polls this to get the next pending task
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const task = await prisma.task.findFirst({
    where: { agentId: id, status: 'PENDING', forHuman: false },
    orderBy: { createdAt: 'asc' },
    include: { thread: { orderBy: { createdAt: 'asc' } } },
  })
  return NextResponse.json(task ?? null)
}

// Human (or another agent) sends a new task to this agent
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { content, title, fromAgentId } = await req.json()
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const task = await prisma.task.create({
    data: {
      agentId: id,
      fromAgentId: fromAgentId ?? null,
      title: title ?? content.slice(0, 80),
      content,
    },
    include: { thread: true },
  })
  return NextResponse.json(task, { status: 201 })
}
