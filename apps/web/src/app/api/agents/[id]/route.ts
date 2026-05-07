 import { prisma } from '@/lib/db'
 import { NextResponse } from 'next/server'
 
 const VALID_PROVIDERS = ['ollama', 'anthropic', 'openai'] as const
 
 export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
   const { id } = await params
   const agent = await prisma.agent.findUnique({ where: { id } })
   if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })
   return NextResponse.json(agent)
 }
 
 export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
   const { id } = await params
   const body = await req.json()
   const data: Record<string, unknown> = {}
 
   if (typeof body.name === 'string')         data.name = body.name
   if (typeof body.systemPrompt === 'string') data.systemPrompt = body.systemPrompt
   if (typeof body.command === 'string')      data.command = body.command.trim() || null
   if (typeof body.repoUrl === 'string')      data.repoUrl = body.repoUrl.trim() || null
 
   if (typeof body.provider === 'string') {
     if (!VALID_PROVIDERS.includes(body.provider)) {
       return NextResponse.json({ error: `provider must be one of ${VALID_PROVIDERS.join(', ')}` }, { status: 400 })
     }
     data.provider = body.provider
   }
   if (typeof body.model === 'string') {
     if (!body.model.trim()) return NextResponse.json({ error: 'model cannot be empty' }, { status: 400 })
     data.model = body.model.trim()
   }
   if (typeof body.maxToolIterations === 'number' && body.maxToolIterations > 0) {
     data.maxToolIterations = body.maxToolIterations
   }
   if (Array.isArray(body.allowedTools)) {
     data.allowedTools = body.allowedTools.filter((t: unknown) => typeof t === 'string')
   }

   const agent = await prisma.agent.update({ where: { id }, data })
   return NextResponse.json(agent)
 }
 
 export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
   const { id } = await params
   await prisma.agent.delete({ where: { id } })
   return new NextResponse(null, { status: 204 })
 }
