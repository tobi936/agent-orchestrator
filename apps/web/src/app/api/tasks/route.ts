import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // 'active' | 'done' | null = all

  const tasks = await prisma.task.findMany({
    where:
      status === 'active'
        ? { status: { in: ['PENDING', 'IN_PROGRESS'] } }
        : status === 'done'
          ? { status: 'DONE' }
          : undefined,
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    take: 200,
    include: {
      agent: { select: { id: true, name: true, status: true } },
      fromAgent: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(tasks)
}
