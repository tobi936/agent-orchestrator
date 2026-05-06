import { prisma } from '@/lib/db'
import { streamContainerLogs } from '@/lib/docker'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const agent = await prisma.agent.findUnique({ where: { id } })

  if (!agent?.containerId) {
    return new Response('Agent is not running', { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (line: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(line)}\n\n`))
      }
      try {
        await streamContainerLogs(agent.containerId!, send, () => controller.close())
      } catch {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
