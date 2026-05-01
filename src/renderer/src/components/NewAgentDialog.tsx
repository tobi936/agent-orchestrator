import { useState } from 'react'
import { agentsApi } from '../lib/api'
import type { Agent, ExecutionMode } from '@shared/types'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (a: Agent) => void
}

const MODELS = [
  { value: 'haiku', label: 'HAiku', desc: 'FAST / LOW-COST — SIMPLE TASKS' },
  { value: 'sonnet', label: 'SONNET', desc: 'BALANCED — RECOMMENDED FOR MOST TASKS' },
  { value: 'opus', label: 'OPUS', desc: 'MAXIMUM POWER — COMPLEX ANALYSIS' },
]

const EXECUTION_MODES: { value: ExecutionMode; label: string; desc: string }[] = [
  { value: 'local', label: 'LOCAL', desc: 'DOCKER CONTAINER — FULL FILE SYSTEM ACCESS' },
  { value: 'remote', label: 'REMOTE', desc: 'CLOUD (SUBSCRIPTION) — NO DOCKER REQUIRED' },
]

export function NewAgentDialog({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [model, setModel] = useState('sonnet')
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('local')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const agent = await agentsApi.create({ name, systemPrompt, model, executionMode })
      onCreated(agent)
      setName('')
      setSystemPrompt('')
      setModel('sonnet')
      onClose()
    } catch (err) {
      setError('[CREATE FAILED] Agent could not be created. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <form
        onSubmit={submit}
        className="bg-term-panel border border-term-border rounded-sm p-5 w-[560px] flex flex-col gap-4 shadow-2xl"
      >
        <div>
          <h2 className="text-sm font-mono uppercase tracking-widest text-term-text">[ INITIALIZE NEW AGENT ]</h2>
          <p className="text-[10px] text-term-muted mt-1 font-mono">
            Configure agent parameters and system directives.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] text-term-text font-mono uppercase tracking-wider">[ DESIGNATION ]</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="E.G. RESEARCH-AGENT, CODING-ASSISTANT..."
            required
            className="bg-black border border-term-border rounded-sm px-3 py-2 text-xs text-term-text font-mono outline-none focus:border-term-blue placeholder:text-term-muted/30"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-term-text font-mono uppercase tracking-wider">[ MODEL SELECT ]</span>
          <div className="flex flex-col gap-1.5">
            {MODELS.map((m) => (
              <label
                key={m.value}
                className={`flex items-start gap-3 p-2.5 rounded-sm border cursor-pointer transition-colors font-mono ${
                  model === m.value
                    ? 'border-term-accent bg-term-accent/10'
                    : 'border-term-border hover:border-term-muted'
                }`}
              >
                <input
                  type="radio"
                  name="model"
                  value={m.value}
                  checked={model === m.value}
                  onChange={() => setModel(m.value)}
                  className="mt-0.5 accent-[#00FF00]"
                />
                <div>
                  <span className="text-[10px] text-term-text">{m.label}</span>
                  <p className="text-[9px] text-term-muted mt-0.5">{m.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-term-text font-mono uppercase tracking-wider">[ EXECUTION MODE ]</span>
          <div className="flex gap-2">
            {EXECUTION_MODES.map((m) => (
              <label
                key={m.value}
                className={`flex-1 flex items-start gap-3 p-2.5 rounded-sm border cursor-pointer transition-colors font-mono ${
                  executionMode === m.value
                    ? 'border-term-accent bg-term-accent/10'
                    : 'border-term-border hover:border-term-muted'
                }`}
              >
                <input
                  type="radio"
                  name="executionMode"
                  value={m.value}
                  checked={executionMode === m.value}
                  onChange={() => setExecutionMode(m.value)}
                  className="mt-0.5 accent-[#00FF00]"
                />
                <div>
                  <span className="text-[10px] text-term-text">{m.label}</span>
                  <p className="text-[9px] text-term-muted mt-0.5">{m.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] text-term-text font-mono uppercase tracking-wider">[ SYSTEM DIRECTIVES ]</span>
          <span className="text-[9px] text-term-muted font-mono">
            Define agent behavior patterns and operational parameters.
          </span>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="YOU ARE A HELPFUL RESEARCH AGENT. YOU ANALYZE TEXTS, SUMMARIZE INFORMATION, AND PROVIDE CLEAR, STRUCTURED RESPONSES."
            rows={4}
            className="bg-black border border-term-border rounded-sm px-3 py-2 text-xs text-term-text font-mono outline-none focus:border-term-blue resize-none placeholder:text-term-muted/30"
          />
        </label>

        {error && (
          <div className="text-[10px] text-term-err bg-term-err/10 border border-term-err/30 rounded-sm px-3 py-2 font-mono">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-[10px] font-mono border border-term-border rounded-sm text-term-muted hover:text-term-text hover:border-term-muted transition-colors uppercase"
          >
            [ CANCEL ]
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-1.5 text-[10px] font-mono border border-term-accent rounded-sm text-term-accent hover:bg-term-accent hover:text-black disabled:opacity-50 transition-colors uppercase"
          >
            {submitting ? '[INITIALIZING...]' : '[INITIALIZE AGENT]'}
          </button>
        </div>
      </form>
    </div>
  )
}
