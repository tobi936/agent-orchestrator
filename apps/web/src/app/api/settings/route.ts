import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const ALLOWED_KEYS = ['autoStart', 'autoStop']

export async function GET() {
  const settings = await prisma.systemSetting.findMany({ where: { key: { in: ALLOWED_KEYS } } })
  const result: Record<string, boolean> = { autoStart: true, autoStop: true }
  for (const s of settings) {
    result[s.key] = s.value === 'true'
  }
  return NextResponse.json(result)
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const updates: { key: string; value: string }[] = []

  for (const key of ALLOWED_KEYS) {
    if (typeof body[key] === 'boolean') {
      updates.push({ key, value: String(body[key]) })
    }
  }

  await Promise.all(
    updates.map((u) =>
      prisma.systemSetting.upsert({
        where: { key: u.key },
        create: { key: u.key, value: u.value },
        update: { value: u.value },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
