import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const [agents, tasks] = await Promise.all([
    prisma.agent.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.task.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { id: true, name: true } },
        fromAgent: { select: { id: true, name: true } },
        thread: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
  ])

  // Per-agent task counts
  const agentStats = agents.map((a) => {
    const agentTasks = tasks.filter((t) => t.agentId === a.id)
    return {
      id: a.id,
      name: a.name,
      status: a.status,
      provider: a.provider,
      model: a.model,
      pending: agentTasks.filter((t) => t.status === 'PENDING').length,
      inProgress: agentTasks.filter((t) => t.status === 'IN_PROGRESS').length,
      done: agentTasks.filter((t) => t.status === 'DONE').length,
    }
  })

  // Flow: fromAgentId → agentId counts
  const flowMap: Record<string, Record<string, number>> = {}
  for (const t of tasks) {
    if (t.fromAgentId && t.agentId) {
      if (!flowMap[t.fromAgentId]) flowMap[t.fromAgentId] = {}
      flowMap[t.fromAgentId][t.agentId] = (flowMap[t.fromAgentId][t.agentId] ?? 0) + 1
    }
  }
  const flows = Object.entries(flowMap).flatMap(([from, targets]) =>
    Object.entries(targets).map(([to, count]) => ({ from, to, count }))
  ).sort((a, b) => b.count - a.count)

  // Global inbox (pending tasks, newest first, limit 20)
  const inbox = tasks
    .filter((t) => t.status === 'PENDING')
    .slice(0, 20)
    .map((t) => ({
      id: t.id,
      title: t.title,
      agentId: t.agentId,
      agentName: t.agent.name,
      fromAgentId: t.fromAgentId,
      fromAgentName: t.fromAgent?.name ?? null,
      createdAt: t.createdAt,
    }))

  // Global outbox (done tasks with agent reply, newest first, limit 20)
  const outbox = tasks
    .filter((t) => t.status === 'DONE')
    .slice(0, 20)
    .map((t) => ({
      id: t.id,
      title: t.title,
      agentId: t.agentId,
      agentName: t.agent.name,
      lastReply: t.thread[0]?.content ?? null,
      createdAt: t.createdAt,
    }))

  const totals = {
    agents: agents.length,
    running: agents.filter((a) => a.status === 'RUNNING').length,
    pending: tasks.filter((t) => t.status === 'PENDING').length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    done: tasks.filter((t) => t.status === 'DONE').length,
  }

  return NextResponse.json({ totals, agentStats, flows, inbox, outbox })
}
