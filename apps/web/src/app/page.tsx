import Link from 'next/link'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const agents = await prisma.agent.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-zinc-400 text-sm mt-1">{agents.length} agent{agents.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/agents/new"
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + New Agent
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-4xl mb-4">🤖</p>
          <p className="font-medium">No agents yet</p>
          <p className="text-sm mt-1">Create your first agent to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}`}
              className="block bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{agent.name}</p>
                  <p className="text-zinc-400 text-sm truncate mt-0.5">{agent.systemPrompt}</p>
                </div>
                <span
                  className={`ml-4 shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                    agent.status === 'RUNNING'
                      ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${agent.status === 'RUNNING' ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                  {agent.status === 'RUNNING' ? 'Running' : 'Stopped'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
