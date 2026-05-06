import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// Worker posts the reply here
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { content, inboxMessageId } = await req.json()
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { agentId: id, direction: 'OUTBOX', content, processed: true },
    }),
    ...(inboxMessageId
      ? [prisma.message.update({ where: { id: inboxMessageId }, data: { processed: true } })]
      : []),
  ])

  return NextResponse.json(message, { status: 201 })
}
