'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function AccountPage() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="max-w-lg mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-6 text-ink-3 gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </Button>

        <h1 className="text-xl font-semibold text-ink mb-6">Account</h1>

        <div className="bg-raised border border-line rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line">
            <p className="text-[11px] font-semibold text-ink-3 uppercase tracking-wide">Profile</p>
          </div>
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-accent-bg border border-accent-bdr flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-accent-fg">U</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Admin</p>
              <p className="text-xs text-ink-3 mt-0.5">Password-protected access</p>
            </div>
          </div>
        </div>

        <div className="bg-raised border border-line rounded-xl overflow-hidden mt-4">
          <div className="px-5 py-3.5 border-b border-line">
            <p className="text-[11px] font-semibold text-ink-3 uppercase tracking-wide">Session</p>
          </div>
          <div className="px-5 py-4 flex flex-col divide-y divide-line">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-ink-2">Authentication</span>
              <Badge variant="running">
                <span className="w-1.5 h-1.5 rounded-full bg-green inline-block" />
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-ink-2">Session duration</span>
              <span className="text-sm text-ink-3">30 days</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-ink-2">Auth method</span>
              <span className="text-sm text-ink-3 font-mono">Cookie (httpOnly)</span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="text-red-500 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2H2.5A1.5 1.5 0 001 3.5v7A1.5 1.5 0 002.5 12H5M9 10l3-3-3-3M13 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}
