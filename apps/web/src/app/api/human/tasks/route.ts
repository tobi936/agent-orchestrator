import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// All tasks across all agents that need human attention
export async function GET() {
  const tasks = await prisma.task.findMany({
    where: { forHuman: true },
    orderBy: { createdAt: 'desc' },
    include: {
      agent: { select: { id: true, name: true } },
      thread: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })
  return NextResponse.json(tasks)
}
