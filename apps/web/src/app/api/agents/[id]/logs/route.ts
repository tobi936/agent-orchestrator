export const dynamic = 'force-dynamic'

const RUNNER_URL = process.env.RUNNER_URL ?? 'http://localhost:3001'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const upstream = await fetch(`${RUNNER_URL}/agents/${id}/logs`, {
    headers: { Accept: 'text/event-stream' },
  })

  if (!upstream.ok || !upstream.body) {
    return new Response('Runner not reachable', { status: 502 })
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
