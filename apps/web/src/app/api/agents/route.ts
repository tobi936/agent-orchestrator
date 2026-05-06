import { prisma } from '@/lib/db'
 import { NextResponse } from 'next/server'
 
 const VALID_PROVIDERS = ['ollama', 'anthropic', 'openai'] as const
 
 export async function GET() {
   const agents = await prisma.agent.findMany({ orderBy: { createdAt: 'desc' } })
   return NextResponse.json(agents)
 }
 
 export async function POST(req: Request) {
   const { name, systemPrompt, provider, model, command, repoUrl } = await req.json()
 
   if (!name || !systemPrompt) {
     return NextResponse.json({ error: 'name and systemPrompt required' }, { status: 400 })
   }
   if (!provider || !VALID_PROVIDERS.includes(provider)) {
     return NextResponse.json({ error: `provider must be one of ${VALID_PROVIDERS.join(', ')}` }, { status: 400 })
   }
   if (!model || typeof model !== 'string' || !model.trim()) {
     return NextResponse.json({ error: 'model required' }, { status: 400 })
   }
 
   const agent = await prisma.agent.create({
     data: {
       name,
       systemPrompt,
       provider,
       model: model.trim(),
       command: command?.trim() || null,
       repoUrl: repoUrl?.trim() || null,
     },
   })
   return NextResponse.json(agent, { status: 201 })
 }
