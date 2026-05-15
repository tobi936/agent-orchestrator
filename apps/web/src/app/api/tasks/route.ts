import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // 'active' | 'done' | null = all

  const where =
    status === 'active'
      ? { status: { in: ['PENDING', 'IN_PROGRESS'] as const } }
      : status === 'done'
        ? { status: 'DONE' as const }
        : {}

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    take: 200,
    include: {
      agent: { select: { id: true, name: true, status: true } },
      fromAgent: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(tasks)
}
