import { useState } from 'react'
import { agentsApi } from '../lib/api'
import type { Agent } from '@shared/types'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (a: Agent) => void
}

type Provider = 'claude' | 'ollama' | 'openai-compatible'

const PROVIDERS: { value: Provider; label: string; desc: string; icon: string }[] = [
  { value: 'claude',            label: 'CLAUDE',           desc: 'ANTHROPIC API — FULL TOOL-USE & AGENTIC LOOP', icon: '◆' },
  { value: 'ollama',            label: 'OLLAMA (LOCAL)',    desc: 'LOCAL MODEL — NO API KEY NEEDED',              icon: '⬡' },
  { value: 'openai-compatible', label: 'OPENAI-COMPATIBLE', desc: 'OPENAI, GROQ, LM STUDIO, TOGETHER AI…',       icon: '○' },
]

const CLAUDE_MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'HAIKU 4.5',   desc: 'FAST / LOW-COST — SIMPLE TASKS' },
  { value: 'claude-sonnet-4-6',         label: 'SONNET 4.6',  desc: 'BALANCED — RECOMMENDED FOR MOST TASKS' },
  { value: 'claude-opus-4-7',           label: 'OPUS 4.7',    desc: 'MAXIMUM POWER — COMPLEX ANALYSIS' },
]

const OLLAMA_MODELS = [
  { value: 'llama3.1',      label: 'LLAMA 3.1',   desc: 'META — SUPPORTS TOOL USE' },
  { value: 'mistral-nemo',  label: 'MISTRAL NEMO', desc: 'MISTRAL — SUPPORTS TOOL USE' },
  { value: 'qwen2.5-coder', label: 'QWEN2.5 CODER', desc: 'ALIBABA — CODING SPECIALIST' },
  { value: 'custom',        label: 'CUSTOM…',      desc: 'ENTER MODEL NAME MANUALLY' },
]

export function NewAgentDialog({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [provider, setProvider] = useState<Provider>('claude')
  const [model, setModel] = useState('claude-sonnet-4-6')
  const [customModel, setCustomModel] = useState('')
  const [providerUrl, setProviderUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const modelList = provider === 'claude' ? CLAUDE_MODELS : provider === 'ollama' ? OLLAMA_MODELS : []
  const isCustomModel = model === 'custom' || provider === 'openai-compatible'
  const finalModel = isCustomModel ? customModel : model

  const handleProviderChange = (p: Provider) => {
    setProvider(p)
    setModel(p === 'claude' ? 'claude-sonnet-4-6' : p === 'ollama' ? 'llama3.1' : 'custom')
    setProviderUrl(p === 'ollama' ? 'http://localhost:11434' : '')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!finalModel.trim()) { setError('[MODEL REQUIRED] Please enter a model name.'); return }
    setSubmitting(true)
    setError(null)
    try {
      const agent = await agentsApi.create({
        name,
        systemPrompt,
        model: finalModel.trim(),
        provider,
        providerUrl: providerUrl || undefined,
      })
      onCreated(agent)
      setName(''); setSystemPrompt(''); setProvider('claude')
      setModel('claude-sonnet-4-6'); setCustomModel(''); setProviderUrl('')
      onClose()
    } catch (err) {
      setError('[CREATE FAILED] Agent could not be created. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 overflow-y-auto py-8">
      <form
        onSubmit={submit}
        className="bg-term-panel border border-term-border rounded-sm p-5 w-[600px] flex flex-col gap-4 shadow-2xl"
      >
        <div>
          <h2 className="text-sm font-mono uppercase tracking-widest text-term-text">[ INITIALIZE NEW AGENT ]</h2>
          <p className="text-[10px] text-term-muted mt-1 font-mono">
            Configure agent parameters, LLM provider, and system directives.
          </p>
        </div>

        {/* Name */}
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

        {/* Provider */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-term-text font-mono uppercase tracking-wider">[ LLM PROVIDER ]</span>
          <div className="flex flex-col gap-1.5">
            {PROVIDERS.map((p) => (
              <label
                key={p.value}
                className={`flex items-start gap-3 p-2.5 rounded-sm border cursor-pointer transition-colors font-mono ${
                  provider === p.value
                    ? 'border-term-accent bg-term-accent/10'
                    : 'border-term-border hover:border-term-muted'
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value={p.value}
                  checked={provider === p.value}
                  onChange={() => handleProviderChange(p.value)}
                  className="mt-0.5 accent-[#00FF00]"
                />
                <div>
                  <span className="text-[10px] text-term-text">{p.icon} {p.label}</span>
                  <p className="text-[9px] text-term-muted mt-0.5">{p.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Provider URL (for ollama/openai-compatible) */}
        {provider !== 'claude' && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] text-term-text font-mono uppercase tracking-wider">
              [ {provider === 'ollama' ? 'OLLAMA URL' : 'API BASE URL'} ]
            </span>
            <input
              value={providerUrl}
              onChange={(e) => setProviderUrl(e.target.value)}
              placeholder={provider === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com'}
              className="bg-black border border-term-border rounded-sm px-3 py-2 text-xs text-term-text font-mono outline-none focus:border-term-blue placeholder:text-term-muted/30"
            />
          </label>
        )}

        {/* Model */}
        {modelList.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-term-text font-mono uppercase tracking-wider">[ MODEL SELECT ]</span>
            <div className="flex flex-col gap-1.5">
              {modelList.map((m) => (
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
        )}

        {/* Custom model name */}
        {isCustomModel && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] text-term-text font-mono uppercase tracking-wider">[ MODEL NAME ]</span>
            <input
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder={provider === 'ollama' ? 'e.g. phi4, deepseek-r1:7b' : 'e.g. gpt-4o, mixtral-8x7b'}
              className="bg-black border border-term-border rounded-sm px-3 py-2 text-xs text-term-text font-mono outline-none focus:border-term-blue placeholder:text-term-muted/30"
            />
          </label>
        )}

        {/* System Prompt */}
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
