"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
// UI components using basic HTML elements


type AgentMetrics = {
  status: "running" | "stopped" | "error";
  sandbox: { cpuPct: number; memoryPct: number; diskPct: number; uptimeSec: number } | null;
  queue: { inboxLength: number; outboxLength: number; msgsPerMin: number; inboxLagSec: number; outboxLagSec: number };
};

export default function DashboardPage() {
  const [agents, setAgents] = useState<number[]>([]);
  const [metrics, setMetrics] = useState<Record<number, AgentMetrics>>({});
  const [loading, setLoading] = useState(true);

  // load agent ids
  useEffect(() => {
    api.get<number[]>("/api/agents").then(setAgents);
  }, []);

  const fetchMetrics = useCallback(async () => {
    const result: Record<number, AgentMetrics> = {};
    await Promise.all(
      agents.map(async (id) => {
        const m = await api.get<AgentMetrics>(`/api/agents/${id}/metrics`);
        result[id] = m;
      })
    );
    setMetrics(result);
    setLoading(false);
  }, [agents]);

  useEffect(() => {
    if (!agents.length) return;
    fetchMetrics();
    const iv = setInterval(fetchMetrics, 5_000);
    return () => clearInterval(iv);
  }, [agents, fetchMetrics]);

  async function control(id: number, act: "start" | "stop" | "restart") {
    if (!confirm(`Confirm ${act} for agent ${id}?`)) return;
    await api.post(`/api/agents/${id}/${act}`);
    fetchMetrics();
  }

  return (
    <section className="p-6">
      <h1 className="text-2xl font-bold mb-4">Agent Dashboard</h1>
      {loading && Loading...}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((id) => {
          const m = metrics[id];
          return (
            <div className="border rounded p-4 flex flex-col"> key={id} className="p-4 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-medium">Agent #{id}</h2>
                <span color={m?.status === "running" ? "green" : m?.status === "stopped" ? "gray" : "red"}>
                  {m?.status?.toUpperCase() ?? "…"}
                </span>
              </div>
              <div className="text-sm text-gray-600 mb-2">
                <p>CPU: {m?.sandbox?.cpuPct ?? "-"}%</p>
                <p>Mem: {m?.sandbox?.memoryPct ?? "-"}%</p>
                <p>Uptime: {m?.sandbox ? `${m.sandbox.uptimeSec}s` : "-"}</p>
              </div>
              <div className="text-sm text-gray-600 mb-2">
                <p>Inbox: {m?.queue.inboxLength} ({m?.queue.inboxLagSec}s lag)</p>
                <p>Outbox: {m?.queue.outboxLength} ({m?.queue.outboxLagSec}s lag)</p>
                <p>Throughput: {m?.queue.msgsPerMin} msg/min</p>
              </div>
              <div className="mt-auto flex gap-2">
                <button onClick={() => control(id, "start")} disabled={m?.status === "running"}>Start</button>
                <Button onClick={() => control(id, "stop")} disabled={m?.status !== "running"} variant="destructive">Stop</Button>
                <Button onClick={() => control(id, "restart")} variant="secondary">Restart</Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
