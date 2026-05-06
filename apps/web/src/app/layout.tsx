import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Agent Orchestrator',
  description: 'Manage and run AI agents locally',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased">
        <header className="border-b border-zinc-800 px-6 py-4">
          <a href="/" className="text-lg font-semibold tracking-tight hover:text-zinc-300 transition-colors">
            Agent Orchestrator
          </a>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  )
}
