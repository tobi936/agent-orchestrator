import { Router } from 'express'
import { requireAuth } from './middleware.js'
import { findUserById, updateUser } from './user-store.js'
import { encrypt, decrypt } from './crypto.js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'

export interface ClaudeCredentialBundle {
  files: Array<{ path: string; content: string }>
  exportedAt: string
}

export function createCredentialsRouter(): Router {
  const router = Router()

  router.post('/', requireAuth, async (req, res) => {
    const { bundle } = req.body as { bundle?: ClaudeCredentialBundle }
    if (!bundle || !Array.isArray(bundle.files)) {
      res.status(400).json({ error: 'invalid bundle' })
      return
    }
    const encrypted = encrypt(JSON.stringify(bundle))
    await updateUser(req.userId, { claudeCredentials: encrypted })
    res.json({ ok: true })
  })

  router.get('/status', requireAuth, async (req, res) => {
    const user = await findUserById(req.userId)
    if (!user?.claudeCredentials) {
      res.json({ hasCredentials: false })
      return
    }
    try {
      const bundle = JSON.parse(decrypt(user.claudeCredentials)) as ClaudeCredentialBundle
      res.json({ hasCredentials: true, exportedAt: bundle.exportedAt })
    } catch {
      res.json({ hasCredentials: false })
    }
  })

  router.delete('/', requireAuth, async (req, res) => {
    await updateUser(req.userId, { claudeCredentials: undefined })
    res.json({ ok: true })
  })

  return router
}

export async function extractCredentialsToDir(userId: string, targetDir: string): Promise<boolean> {
  const user = await findUserById(userId)
  if (!user?.claudeCredentials) return false
  try {
    const bundle = JSON.parse(decrypt(user.claudeCredentials)) as ClaudeCredentialBundle
    for (const file of bundle.files) {
      const dest = join(targetDir, file.path)
      mkdirSync(dirname(dest), { recursive: true })
      writeFileSync(dest, Buffer.from(file.content, 'base64'))
    }
    return true
  } catch {
    return false
  }
}
