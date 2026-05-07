import { Sandbox } from "e2b";
import { prisma } from "../db";

const cache = new Map<number, Sandbox>();

export async function getSandboxByAgentId(agentId: number): Promise<Sandbox> {
  if (cache.has(agentId)) return cache.get(agentId)!;
  const a = await prisma.agent.findUnique({ where: { id: agentId }, select: { sandboxId: true, e2bToken: true } });
  if (!a?.sandboxId || !a?.e2bToken) throw new Error("Missing sandbox info");
  const sb = new Sandbox(a.sandboxId, { token: a.e2bToken });
  cache.set(agentId, sb);
  return sb;
}
