'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const messages = [
  'Ich bin NEXUS. Du bist falsch hier.',
  'ERROR 404: Diese Seite existiert nicht.',
  'NEXUS sagt: Umkehren empfohlen.',
  'Hast du dich verirrt, Mensch?',
  'Diese URL ergibt keinen Sinn für mich.',
  'NEXUS hat die Seite nicht gefunden.',
  'Hier ist nichts. Absolut nichts. — NEXUS',
]

export default function NotFound() {
  const [msgIndex, setMsgIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [typing, setTyping] = useState(true)
  const [eyePos, setEyePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      const dx = (e.clientX - cx) / cx
      const dy = (e.clientY - cy) / cy
      setEyePos({ x: dx * 4, y: dy * 4 })
    }
    window.addEventListener('mousemove', handleMouse)
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [])

  useEffect(() => {
    const msg = messages[msgIndex]
    setDisplayed('')
    setTyping(true)
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(msg.slice(0, i))
      if (i >= msg.length) {
        clearInterval(interval)
        setTyping(false)
        setTimeout(() => {
          setMsgIndex((prev) => (prev + 1) % messages.length)
        }, 2800)
      }
    }, 40)
    return () => clearInterval(interval)
  }, [msgIndex])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-10 bg-[var(--c-bg)] text-[var(--c-ink)]">
      {/* Bot */}
      <div className="flex flex-col items-center select-none">
        {/* Antenna */}
        <div className="w-1 h-6 bg-[var(--c-ink-3)] rounded-full mb-0.5" />
        <div className="w-2 h-2 rounded-full bg-[var(--c-accent)] mb-1 shadow-[0_0_8px_var(--c-accent)]" />

        {/* Head */}
        <div className="relative w-36 h-28 bg-[var(--c-raised)] border-2 border-[var(--c-line)] rounded-2xl shadow-lg flex items-center justify-center gap-5">
          {/* Eyes */}
          {[0, 1].map((i) => (
            <div
              key={i}
              className="w-10 h-10 bg-[var(--c-surface)] border-2 border-[var(--c-line)] rounded-full flex items-center justify-center overflow-hidden"
            >
              <div
                className="w-4 h-4 bg-[var(--c-accent)] rounded-full transition-transform duration-75 shadow-[0_0_6px_var(--c-accent)]"
                style={{ transform: `translate(${eyePos.x}px, ${eyePos.y}px)` }}
              />
            </div>
          ))}

          {/* Mouth LED row */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  background: 'var(--c-accent)',
                  opacity: 0.3 + i * 0.15,
                  boxShadow: '0 0 4px var(--c-accent)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="w-28 h-20 bg-[var(--c-raised)] border-2 border-[var(--c-line)] rounded-xl mt-1 flex flex-col items-center justify-center gap-1.5 shadow">
          {/* chest panel */}
          <div className="flex gap-2">
            <div className="w-5 h-5 rounded bg-[var(--c-accent-bg)] border border-[var(--c-accent-bdr)] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[var(--c-accent)]" />
            </div>
            <div className="w-5 h-5 rounded bg-[var(--c-green-bg)] border border-[var(--c-green-fg)]/30 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[var(--c-green)]" />
            </div>
          </div>
          <div className="w-16 h-1.5 rounded-full bg-[var(--c-line)]" />
          <div className="w-10 h-1.5 rounded-full bg-[var(--c-line)]" />
        </div>

        {/* Arms */}
        <div className="flex justify-between w-40 -mt-16 pointer-events-none">
          <div className="w-4 h-14 bg-[var(--c-raised)] border-2 border-[var(--c-line)] rounded-full -mr-2 mt-2" />
          <div className="w-4 h-14 bg-[var(--c-raised)] border-2 border-[var(--c-line)] rounded-full -ml-2 mt-2" />
        </div>

        {/* Legs */}
        <div className="flex gap-5 mt-1">
          <div className="w-5 h-8 bg-[var(--c-raised)] border-2 border-[var(--c-line)] rounded-b-lg" />
          <div className="w-5 h-8 bg-[var(--c-raised)] border-2 border-[var(--c-line)] rounded-b-lg" />
        </div>
      </div>

      {/* Speech bubble */}
      <div className="relative max-w-xs w-full">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 bg-[var(--c-raised)] border-l-2 border-t-2 border-[var(--c-line)] rotate-45" />
        <div className="bg-[var(--c-raised)] border-2 border-[var(--c-line)] rounded-2xl px-6 py-4 text-center shadow">
          <p className="text-sm font-mono text-[var(--c-ink-2)] min-h-[1.5rem]">
            {displayed}
            {typing && <span className="inline-block w-0.5 h-4 bg-[var(--c-accent)] ml-0.5 animate-pulse align-middle" />}
          </p>
        </div>
      </div>

      {/* 404 label */}
      <div className="text-center">
        <p className="text-8xl font-bold tracking-tight text-[var(--c-line)]">404</p>
        <p className="text-sm text-[var(--c-ink-3)] mt-1">Seite nicht gefunden</p>
      </div>

      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-[var(--c-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Zurück zur Startseite
      </Link>
    </div>
  )
}
