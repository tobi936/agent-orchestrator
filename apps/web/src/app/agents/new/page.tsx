'use client'
 
 import { useState } from 'react'
 import { useRouter } from 'next/navigation'
 
 const PROVIDERS = [
   { value: 'ollama',    label: 'Ollama Cloud',  defaultModel: 'gpt-oss:20b',              hint: 'e.g. gpt-oss:20b, gpt-oss:120b, deepseek-v3.1:671b, qwen3-coder:480b' },
   { value: 'anthropic', label: 'Anthropic',     defaultModel: 'claude-haiku-4-5-20251001', hint: 'e.g. claude-haiku-4-5-20251001, claude-sonnet-4-5' },
   { value: 'openai',    label: 'OpenAI',        defaultModel: 'gpt-4o-mini',               hint: 'e.g. gpt-4o, gpt-4o-mini, gpt-4.1' },
 ] as const
 
 export default function NewAgentPage() {
   const router = useRouter()
   const [name, setName] = useState('')
   const [systemPrompt, setSystemPrompt] = useState('')
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
       <header className="h-11 flex items-center justify-between px-4 border-b border-line bg-surface shrink-0">
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
 
           <form onSubmit={handleSubmit} className="space-y-4">
             <div>
               <label className="block text-[11px] font-medium text-ink-3 mb-1.5 uppercase tracking-wider">
                 Name
               </label>
               <input
                 type="text"
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 placeholder="e.g. Research Assistant"
                 required
                 className="w-full bg-raised border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-4 focus:outline-none 
focus:border-accent transition-colors"
               />
             </div>
 
             <div>
               <label className="block text-[11px] font-medium text-ink-3 mb-1.5 uppercase tracking-wider">
                 System Prompt
               </label>
               <textarea
                 value={systemPrompt}
                 onChange={(e) => setSystemPrompt(e.target.value)}
                 placeholder="You are a helpful assistant that…"
                 required
                 rows={5}
                 className="w-full bg-raised border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-4 focus:outline-none 
focus:border-accent transition-colors resize-none font-sans"
               />
             </div>
 
             <div className="border-t border-line pt-4 space-y-4">
               <p className="text-[11px] font-medium text-ink-3 uppercase tracking-wider">AI provider</p>
 
               <div>
                 <label className="block text-[11px] font-medium text-ink-3 mb-1.5 uppercase tracking-wider">
                   Provider
                 </label>
                 <select
                   value={provider}
                   onChange={(e) => handleProviderChange(e.target.value as typeof PROVIDERS[number]['value'])}
                   className="w-full bg-raised border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-accent 
transition-colors"
                 >
                   {PROVIDERS.map((p) => (
                     <option key={p.value} value={p.value}>{p.label}</option>
                   ))}
                 </select>
               </div>
 
               <div>
                 <label className="block text-[11px] font-medium text-ink-3 mb-1.5 uppercase tracking-wider">
                   Model
                 </label>
                 <input
                   type="text"
                   value={model}
                   onChange={(e) => setModel(e.target.value)}
                   required
                   className="w-full bg-raised border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-4 focus:outline-none 
focus:border-accent transition-colors font-mono"
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
                 <input
                   type="text"
                   value={repoUrl}
                   onChange={(e) => setRepoUrl(e.target.value)}
                   placeholder="https://github.com/you/your-repo"
                   className="w-full bg-raised border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-4 focus:outline-none 
focus:border-accent transition-colors"
                 />
                 <p className="text-[11px] text-ink-3 mt-1">Cloned to /workspace on start</p>
               </div>

               <div>
                 <label className="block text-[11px] font-medium text-ink-3 mb-1.5 uppercase tracking-wider">
                   Max Tool Iterations
                 </label>
                 <input
                   type="number"
                   min={1}
                   max={500}
                   value={maxToolIterations}
                   onChange={(e) => setMaxToolIterations(Number(e.target.value))}
                   required
                   className="w-full bg-raised border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-accent transition-colors"
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
               <button
                 type="submit"
                 disabled={loading}
                 className="bg-accent hover:opacity-90 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
               >
                 {loading ? 'Creating…' : 'Create Agent'}
               </button>
               <button
                 type="button"
                 onClick={() => router.push('/')}
                 className="text-sm font-medium text-ink-3 hover:text-ink px-4 py-2 rounded-lg hover:bg-hover transition-colors"
               >
                 Cancel
               </button>
             </div>
           </form>
         </div>
       </div>
     </div>
   )
 }
