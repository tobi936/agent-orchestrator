import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSandboxByAgentId } from '@/services/e2bSandbox';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idParam = req.headers.get('x-nextjs-param-id') || searchParams.get('id');
  // In Next.js dynamic route, the id is part of the path but we can get from params via context.
  // However for simplicity, we extract from the URL pathname.
  const match = req.url.match(/\/agents\/([^/]+)\/metrics/);
  const idStr = match ? match[1] : null;
  const agentId = Number(idStr);
  if (isNaN(agentId)) return NextResponse.json({ error: 'Invalid agent id' }, { status: 400 });

  const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { id: true, status: true } });
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  let sandboxMetrics = null;
  try {
    const sandbox = await getSandboxByAgentId(agentId);
    sandboxMetrics = await sandbox.metrics();
  } catch (e) {
    console.warn(`Sandbox metrics failed for ${agentId}`, e);
  }

  const [inbox, outbox] = await Promise.all([
    prisma.message.findMany({ where: { agentId, direction: 'INBOUND', processedAt: null }, select: { createdAt: true } }),
    prisma.message.findMany({ where: { agentId, direction: 'OUTBOUND', processedAt: null }, select: { createdAt: true } }),
  ]);

  const now = new Date();
  const avgLag = (msgs: { createdAt: Date }[]) => {
    if (!msgs.length) return 0;
    const total = msgs.reduce((sum, m) => sum + (now.getTime() - m.createdAt.getTime()), 0);
    return Math.round(total / msgs.length / 1000);
  };

  const oneMinAgo = new Date(Date.now() - 60_000);
  const msgsLastMinute = await prisma.message.count({ where: { agentId, createdAt: { gte: oneMinAgo } } });

  return NextResponse.json({
    status: agent.status,
    sandbox: sandboxMetrics ? {
      cpuPct: sandboxMetrics.cpu,
      memoryPct: sandboxMetrics.memory,
      diskPct: sandboxMetrics.disk,
      uptimeSec: sandboxMetrics.uptime,
    } : null,
    queue: {
      inboxLength: inbox.length,
      outboxLength: outbox.length,
      msgsPerMin: msgsLastMinute,
      inboxLagSec: avgLag(inbox),
      outboxLagSec: avgLag(outbox),
    },
  });
}
