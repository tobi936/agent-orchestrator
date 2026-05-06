import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const agents = await prisma.agent.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(agents)
}

export async function POST(req: Request) {
  const { name, systemPrompt } = await req.json()
  if (!name || !systemPrompt) {
    return NextResponse.json({ error: 'name and systemPrompt required' }, { status: 400 })
  }
  const agent = await prisma.agent.create({ data: { name, systemPrompt } })
  return NextResponse.json(agent, { status: 201 })
}
