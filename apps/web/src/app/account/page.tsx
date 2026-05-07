'use client'

import { useRouter } from 'next/navigation'

export default function AccountPage() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
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

        <h1 className="text-xl font-semibold text-[var(--c-ink)] mb-6">Account</h1>

        <div className="bg-[var(--c-raised)] border border-[var(--c-line)] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--c-line)]">
            <p className="text-[11px] font-semibold text-[var(--c-ink-3)] uppercase tracking-wide">Profile</p>
          </div>
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--c-accent-bg)] border border-[var(--c-accent-bdr)] flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-[var(--c-accent-fg)]">U</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--c-ink)]">Admin</p>
              <p className="text-xs text-[var(--c-ink-3)] mt-0.5">Password-protected access</p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--c-raised)] border border-[var(--c-line)] rounded-xl overflow-hidden mt-4">
          <div className="px-5 py-4 border-b border-[var(--c-line)]">
            <p className="text-[11px] font-semibold text-[var(--c-ink-3)] uppercase tracking-wide">Session</p>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--c-ink-2)]">Authentication</span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--c-green-fg)] bg-[var(--c-green-bg)] px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-green)] inline-block" />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--c-ink-2)]">Session duration</span>
              <span className="text-sm text-[var(--c-ink-3)]">30 days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--c-ink-2)]">Auth method</span>
              <span className="text-sm text-[var(--c-ink-3)]">Cookie (httpOnly)</span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 dark:border-red-900/50 text-red-500 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2H2.5A1.5 1.5 0 001 3.5v7A1.5 1.5 0 002.5 12H5M9 10l3-3-3-3M13 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
