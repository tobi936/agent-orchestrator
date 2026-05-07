import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// Get task details + full thread
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { taskId } = await params
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      thread: { orderBy: { createdAt: 'asc' } },
      fromAgent: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true } },
    },
  })
  if (!task) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(task)
}

// Human replies to a task (forHuman=true) or adds a follow-up
export async function POST(req: Request, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { taskId } = await params
  const { content } = await req.json()
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const [message] = await prisma.$transaction([
    prisma.taskMessage.create({ data: { taskId, role: 'user', content } }),
    prisma.task.update({
      where: { id: taskId },
      data: { forHuman: false, status: 'PENDING' },
    }),
  ])
  return NextResponse.json(message, { status: 201 })
}
