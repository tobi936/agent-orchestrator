import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { getSandboxByAgentId } from "../services/e2bSandbox";

const router = Router();

router.get(":id/metrics", async (req: Request, res: Response) => {
  const agentId = Number(req.params.id);
  if (isNaN(agentId)) return res.status(400).json({ error: "Invalid agent id" });

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, status: true },
  });
  if (!agent) return res.status(404).json({ error: "Agent not found" });

  // Sandbox metrics via E2B SDK
  let sandboxMetrics = null;
  try {
    const sandbox = await getSandboxByAgentId(agentId);
    sandboxMetrics = await sandbox.metrics(); // { cpu, memory, disk, uptime }
  } catch (e) {
    console.warn(`Sandbox metrics failed for ${agentId}`, e);
  }

  // Queue statistics
  const [inbox, outbox] = await Promise.all([
    prisma.message.findMany({ where: { agentId, direction: "INBOUND", processedAt: null }, select: { createdAt: true } }),
    prisma.message.findMany({ where: { agentId, direction: "OUTBOUND", processedAt: null }, select: { createdAt: true } }),
  ]);

  const now = new Date();
  const avgLag = (msgs: { createdAt: Date }[]) => {
    if (!msgs.length) return 0;
    const total = msgs.reduce((sum, m) => sum + (now.getTime() - m.createdAt.getTime()), 0);
    return Math.round(total / msgs.length / 1000);
  };

  const oneMinAgo = new Date(Date.now() - 60_000);
  const msgsLastMinute = await prisma.message.count({
    where: { agentId, createdAt: { gte: oneMinAgo } },
  });

  res.json({
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
});

export default router;
