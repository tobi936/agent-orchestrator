import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// Worker polls this to get the next unprocessed message
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const message = await prisma.message.findFirst({
    where: { agentId: id, direction: 'INBOX', processed: false },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(message ?? null)
}

// User sends a message to the agent
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { content } = await req.json()
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const message = await prisma.message.create({
    data: { agentId: id, direction: 'INBOX', content },
  })
  return NextResponse.json(message, { status: 201 })
}
