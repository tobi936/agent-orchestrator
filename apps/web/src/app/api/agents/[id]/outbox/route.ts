import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// Runner marks a task done and optionally routes it to another agent
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { taskId, reply, targetAgentId, targetTitle } = await req.json()
  if (!taskId || !reply) return NextResponse.json({ error: 'taskId and reply required' }, { status: 400 })

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: taskId },
      data: { status: 'DONE' },
    })
    await tx.taskMessage.create({
      data: { taskId, role: 'agent', content: reply },
    })
    if (targetAgentId) {
      await tx.task.create({
        data: {
          agentId: targetAgentId,
          fromAgentId: id,
          title: targetTitle ?? reply.slice(0, 80),
          content: reply,
        },
      })
    }
  })

  return NextResponse.json({ ok: true }, { status: 200 })
}
