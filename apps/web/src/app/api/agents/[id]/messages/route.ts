import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// Returns all messages for an agent, sorted oldest first
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const messages = await prisma.message.findMany({
    where: { agentId: id },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(messages)
}
