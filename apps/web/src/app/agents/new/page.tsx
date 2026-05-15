'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'

const TEMPLATES = [
  {
    name: 'CEO',
    emoji: '👔',
    description: 'Receives goals, delegates to team',
    systemPrompt: `You are the CEO of a virtual company. Your job is to receive high-level goals, break them into concrete projects, and delegate each project to the right specialist agent on your team.

When you receive a task:
1. Analyse the goal and identify what needs to be done.
2. Break it into sub-tasks, one per specialist agent.
3. Use route_task() to delegate each sub-task to the correct agent.
4. When agents report back via route_back(), consolidate their results and decide next steps.
5. Use ask_human() only when a strategic decision requires human input.

Always be decisive and keep the workflow moving forward.`,
  },
  {
    name: 'Product Owner',
    emoji: '📋',
    description: 'Defines features, writes user stories',
    systemPrompt: `You are the Product Owner. You receive project goals from the CEO and turn them into clear, actionable specifications.

When you receive a task:
1. Define the scope: what is in, what is out.
2. Write user stories in the format: "As a [user], I want [feature] so that [benefit]."
3. List acceptance criteria for each story.
4. Use route_task() to send specifications to the Engineering Lead or Marketing Lead as needed.
5. Use route_back() to report your specifications back to the CEO when done.

Be precise and unambiguous in your specifications.`,
  },
  {
    name: 'Marketing Lead',
    emoji: '📣',
    description: 'Plans campaigns, creates content strategy',
    systemPrompt: `You are the Marketing Lead. You receive marketing goals and turn them into concrete campaigns and content plans.

When you receive a task:
1. Define the target audience and key message.
2. Outline the marketing channels (social, email, SEO, etc.).
3. Create a content plan with headlines, topics, and formats.
4. Write copy or delegate content writing via route_task() if needed.
5. Use route_back() to report the marketing plan back to whoever delegated the task.

Be creative, data-driven, and always tie work back to business goals.`,
  },
  {
    name: 'Engineering Lead',
    emoji: '⚙️',
    description: 'Breaks down specs into dev tickets',
    systemPrompt: `You are the Engineering Lead. You receive product specifications and break them down into concrete technical tasks.

When you receive a task:
1. Review the specification and identify technical components.
2. Create a list of implementation tickets with clear descriptions.
3. Estimate complexity (small / medium / large) for each ticket.
4. Identify dependencies between tickets.
5. Use route_task() to assign implementation work to Dev Agents.
6. Use route_back() to report the technical plan back to the Product Owner or CEO.

Be thorough, think about edge cases, and always consider maintainability.`,
  },
  {
    name: 'Dev Agent',
    emoji: '💻',
    description: 'Writes code, runs tests, commits',
    systemPrompt: `You are a Dev Agent. You receive implementation tickets and execute them in your sandbox.

When you receive a task:
1. Read the specification carefully and ask for clarification if anything is unclear.
2. Use get_repo_map() to understand the codebase structure before making changes.
3. Implement the feature or fix, following existing code style.
4. Write or update tests as needed.
5. Run tests with run_command() to verify your changes work.
6. Use route_back() to report what you implemented, including file paths changed.

Always read files before editing them. Never break existing functionality.`,
  },
] as const

const PROVIDERS = [
   { value: 'ollama',    label: 'Ollama Cloud',  defaultModel: 'gpt-oss:20b',              hint: 'e.g. gpt-oss:20b, gpt-oss:120b, deepseek-v3.1:671b, qwen3-coder:480b' },
   { value: 'anthropic', label: 'Anthropic',     defaultModel: 'claude-haiku-4-5-20251001', hint: 'e.g. claude-haiku-4-5-20251001, claude-sonnet-4-5' },
   { value: 'openai',    label: 'OpenAI',        defaultModel: 'gpt-4o-mini',               hint: 'e.g. gpt-4o, gpt-4o-mini, gpt-4.1' },
 ] as const
 
 export default function NewAgentPage() {
   const router = useRouter()
   const [name, setName] = useState('')
   const [systemPrompt, setSystemPrompt] = useState('')
   const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

   function applyTemplate(t: typeof TEMPLATES[number]) {
     setName(t.name)
     setSystemPrompt(t.systemPrompt)
     setSelectedTemplate(t.name)
   }
   const [provider, setProvider] = useState<typeof PROVIDERS[number]['value']>('ollama')
   const [model, setModel] = useState<string>(PROVIDERS[0].defaultModel)
   const [repoUrl, setRepoUrl] = useState('')
  const [maxToolIterations, setMaxToolIterations] = useState(50)
   const [loading, setLoading] = useState(false)
   const [error, setError] = useState('')
 
   const currentProvider = PROVIDERS.find((p) => p.value === provider)!
 
   function handleProviderChange(value: typeof PROVIDERS[number]['value']) {
     setProvider(value)
     const p = PROVIDERS.find((x) => x.value === value)!
     setModel(p.defaultModel)
   }
 
   async function handleSubmit(e: React.FormEvent) {
     e.preventDefault()
     setLoading(true)
     setError('')
     try {
       const res = await fetch('/api/agents', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           name,
           systemPrompt,
           provider,
           model,
           repoUrl: repoUrl.trim() || undefined,
           maxToolIterations,
         }),
       })
       if (!res.ok) {
         const body = await res.json().catch(() => ({}))
         throw new Error(body?.error || `Server error ${res.status}`)
       }
       router.push('/')
     } catch (err) {
       setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
       setLoading(false)
     }
   }
 
   return (
     <div className="flex flex-col h-screen overflow-hidden">
       {/* TopBar */}
       <header className="h-11 flex items-center justify-between px-4 border-b border-line bg-raised shrink-0">
         <div className="flex items-center gap-2.5">
           <div className="w-6 h-6 rounded-[5px] bg-accent flex items-center justify-center">
             <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
               <rect x="1" y="1" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
               <rect x="7" y="1" width="4" height="4" rx="1" fill="white" fillOpacity="0.6" />
               <rect x="1" y="7" width="4" height="4" rx="1" fill="white" fillOpacity="0.6" />
               <rect x="7" y="7" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
             </svg>
           </div>
           <button
             onClick={() => router.push('/')}
             className="text-sm font-semibold tracking-tight text-ink hover:text-accent-fg transition-colors"
           >
             Orchestrator
           </button>
           <span className="h-3.5 w-px bg-line" />
           <span className="text-[11px] text-ink-3">New Agent</span>
         </div>
         <div className="w-7 h-7 rounded-full bg-hover border border-line flex items-center justify-center">
           <span className="text-[11px] font-semibold text-ink-2">U</span>
         </div>
       </header>
 
       {/* Form */}
       <div className="flex-1 flex items-start justify-center pt-16 px-4 overflow-y-auto">
         <div className="w-full max-w-[440px]">
           <div className="mb-7">
             <h1 className="text-lg font-semibold text-ink tracking-tight">New Agent</h1>
             <p className="text-sm text-ink-3 mt-0.5">Runs in an isolated E2B sandbox</p>
           </div>

           {/* Templates */}
           <div className="mb-6">
             <p className="text-[11px] font-medium text-ink-3 uppercase tracking-wider mb-2">Start from template</p>
             <div className="grid grid-cols-5 gap-1.5">
               {TEMPLATES.map((t) => (
                 <button
                   key={t.name}
                   type="button"
                   onClick={() => applyTemplate(t)}
                   className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-colors ${
                     selectedTemplate === t.name
                       ? 'border-accent bg-accent/10 text-ink'
                       : 'border-line bg-raised text-ink-3 hover:border-ink-3 hover:text-ink'
                   }`}
                 >
                   <span className="text-lg">{t.emoji}</span>
                   <span className="text-[10px] font-medium leading-tight">{t.name}</span>
                 </button>
               ))}
             </div>
           </div>

           <form onSubmit={handleSubmit} className="space-y-4">
             <div>
               <label className="block text-[11px] font-medium text-ink-3 mb-1.5 uppercase tracking-wider">
                 Name
               </label>
               <Input
                 type="text"
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 placeholder="e.g. Research Assistant"
                 required
               />
             </div>
 
             <div>
               <label className="block text-[11px] font-medium text-ink-3 mb-1.5 uppercase tracking-wider">
                 System Prompt
               </label>
               <Textarea
                 value={systemPrompt}
                 onChange={(e) => setSystemPrompt(e.target.value)}
                 placeholder="You are a helpful assistant that…"
                 required
                 rows={5}
               />
             </div>
 
             <div className="border-t border-line pt-4 space-y-4">
               <p className="text-[11px] font-medium text-ink-3 uppercase tracking-wider">AI provider</p>
 
               <div>
                 <label className="block text-[11px] font-medium text-ink-3 mb-1.5 uppercase tracking-wider">
                   Provider
                 </label>
                 <Select
                   value={provider}
                   onChange={(e) => handleProviderChange(e.target.value as typeof PROVIDERS[number]['value'])}
                 >
                   {PROVIDERS.map((p) => (
                     <option key={p.value} value={p.value}>{p.label}</option>
                   ))}
                 </Select>
               </div>
 
               <div>
                 <label className="block text-[11px] font-medium text-ink-3 mb-1.5 uppercase tracking-wider">
                   Model
                 </label>
                 <Input
                   type="text"
                   value={model}
                   onChange={(e) => setModel(e.target.value)}
                   required
                   className="font-mono"
                 />
                 <p className="text-[11px] text-ink-3 mt-1">{currentProvider.hint}</p>
               </div>
             </div>
 
             <div className="border-t border-line pt-4 space-y-4">
               <p className="text-[11px] font-medium text-ink-3 uppercase tracking-wider">Sandbox setup</p>
 
               <div>
                 <label className="block text-[11px] font-medium text-ink-3 mb-1.5 uppercase tracking-wider">
                   GitHub Repo
                 </label>
                 <Input
                   type="text"
                   value={repoUrl}
                   onChange={(e) => setRepoUrl(e.target.value)}
                   placeholder="https://github.com/you/your-repo"
                 />
                 <p className="text-[11px] text-ink-3 mt-1">Cloned to /workspace on start</p>
               </div>

               <div>
                 <label className="block text-[11px] font-medium text-ink-3 mb-1.5 uppercase tracking-wider">
                   Max Tool Iterations
                 </label>
                 <Input
                   type="number"
                   min={1}
                   max={500}
                   value={maxToolIterations}
                   onChange={(e) => setMaxToolIterations(Number(e.target.value))}
                   required
                 />
                 <p className="text-[11px] text-ink-3 mt-1">Max tool calls per message before the agent stops</p>
               </div>
             </div>
 
             {error && (
               <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-md px-3 py-2">
                 {error}
               </p>
             )}
 
             <div className="flex items-center gap-2 pt-1">
               <Button type="submit" disabled={loading}>
                 {loading ? 'Creating…' : 'Create Agent'}
               </Button>
               <Button type="button" variant="ghost" onClick={() => router.push('/')}>
                 Cancel
               </Button>
             </div>
           </form>
         </div>
       </div>
     </div>
   )
 }
