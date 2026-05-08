'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative rounded-full transition-colors shrink-0 ${value ? 'bg-[var(--c-accent)]' : 'bg-[var(--c-line)]'}`}
      style={{ width: 32, height: 18 }}
    >
      <span
        className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-[14px]' : 'translate-x-0.5'}`}
      />
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--c-raised)] border border-[var(--c-line)] rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--c-line)]">
        <p className="text-[11px] font-semibold text-[var(--c-ink-3)] uppercase tracking-wide">{title}</p>
      </div>
      <div className="divide-y divide-[var(--c-line)]">{children}</div>
    </div>
  )
}

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div>
        <p className="text-sm font-medium text-[var(--c-ink)]">{label}</p>
        {description && <p className="text-xs text-[var(--c-ink-3)] mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

interface OllamaKeyStatus {
  total: number
  current: number
  maskedKeys: string[]
}

export default function SettingsPage() {
  const router = useRouter()
  const [autoStart, setAutoStart] = useState(true)
  const [autoStop, setAutoStop] = useState(true)
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system')
  const [ollamaKeys, setOllamaKeys] = useState<OllamaKeyStatus | null>(null)
  const [switchingKey, setSwitchingKey] = useState(false)

  const fetchOllamaKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/ollama-keys')
      if (res.ok) setOllamaKeys(await res.json())
    } catch {}
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setAutoStart(data.autoStart)
        setAutoStop(data.autoStop)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('theme')
      if (storedTheme === 'dark' || storedTheme === 'light') setTheme(storedTheme)
      else setTheme('system')
    } catch {}
    fetchOllamaKeys()
    fetchSettings()
  }, [fetchOllamaKeys, fetchSettings])

  async function handleSwitchKey(index?: number) {
    setSwitchingKey(true)
    try {
      const res = await fetch('/api/ollama-keys/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(index !== undefined ? { index } : {}),
      })
      if (res.ok) setOllamaKeys(await res.json())
    } finally {
      setSwitchingKey(false)
    }
  }

  async function handleAutoStart(val: boolean) {
    setAutoStart(val)
    await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ autoStart: val }) })
  }

  async function handleAutoStop(val: boolean) {
    setAutoStop(val)
    await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ autoStop: val }) })
  }

  function handleTheme(val: 'system' | 'light' | 'dark') {
    setTheme(val)
    try {
      if (val === 'system') {
        localStorage.removeItem('theme')
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.classList.toggle('dark', prefersDark)
      } else {
        localStorage.setItem('theme', val)
        document.documentElement.classList.toggle('dark', val === 'dark')
      }
    } catch {}
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)] p-6">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-[var(--c-ink-3)] hover:text-[var(--c-ink)] transition-colors mb-6"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>

        <h1 className="text-xl font-semibold text-[var(--c-ink)] mb-6">Settings</h1>

        <div className="flex flex-col gap-4">
          <Section title="Appearance">
            <Row label="Theme" description="Choose your preferred color scheme">
              <div className="flex items-center gap-1 bg-[var(--c-hover)] rounded-lg p-0.5">
                {(['system', 'light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleTheme(t)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                      theme === t
                        ? 'bg-[var(--c-raised)] text-[var(--c-ink)] shadow-sm'
                        : 'text-[var(--c-ink-3)] hover:text-[var(--c-ink)]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Row>
          </Section>

          <Section title="Agents">
            <Row label="Auto-start" description="Automatically start a stopped agent when a task is pending">
              <Toggle value={autoStart} onChange={handleAutoStart} />
            </Row>
            <Row label="Auto-stop" description="Automatically stop an idle agent when all tasks are done">
              <Toggle value={autoStop} onChange={handleAutoStop} />
            </Row>
          </Section>

          {ollamaKeys && ollamaKeys.total > 0 && (
            <Section title="Ollama API Keys">
              <Row
                label="Active key"
                description={`Key ${ollamaKeys.current + 1} of ${ollamaKeys.total}: ${ollamaKeys.maskedKeys[ollamaKeys.current] ?? '—'}`}
              >
                {ollamaKeys.total > 1 && (
                  <button
                    onClick={() => handleSwitchKey()}
                    disabled={switchingKey}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--c-accent)] text-white hover:opacity-80 transition-opacity disabled:opacity-40"
                  >
                    {switchingKey ? 'Switching…' : 'Switch key'}
                  </button>
                )}
              </Row>
              {ollamaKeys.total > 1 && (
                <div className="px-5 py-3 flex flex-wrap gap-2">
                  {ollamaKeys.maskedKeys.map((key, i) => (
                    <button
                      key={i}
                      onClick={() => handleSwitchKey(i)}
                      disabled={switchingKey || i === ollamaKeys.current}
                      className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors border ${
                        i === ollamaKeys.current
                          ? 'border-[var(--c-accent)] text-[var(--c-accent)] bg-[var(--c-accent)]/10 cursor-default'
                          : 'border-[var(--c-line)] text-[var(--c-ink-3)] hover:text-[var(--c-ink)] hover:border-[var(--c-ink-3)] disabled:opacity-40'
                      }`}
                    >
                      {i === ollamaKeys.current && <span className="mr-1">&#10003;</span>}
                      Key {i + 1}: {key}
                    </button>
                  ))}
                </div>
              )}
            </Section>
          )}

          <Section title="About">
            <Row label="Version">
              <span className="text-sm text-[var(--c-ink-3)] font-mono">0.1.0</span>
            </Row>
            <Row label="Stack">
              <span className="text-sm text-[var(--c-ink-3)]">Next.js · Prisma · E2B</span>
            </Row>
          </Section>
        </div>
      </div>
    </div>
  )
}
