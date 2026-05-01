#!/usr/bin/env node
/**
 * Inbox/Outbox watcher for a Claude Code agent.
 *
 * Reads JSON message files from /data/inbox, runs `claude -p` with the
 * combined system prompt + body, and writes the assistant's reply to
 * /data/outbox addressed back to the sender.
 *
 * The body may contain a delegation directive on the first line that the
 * orchestrator picks up and forwards. The agent communicates the directive
 * by emitting a JSON file directly into /data/outbox like:
 *   { "to": "<agent-id-or-name>", "subject": "...", "body": "..." }
 */
import { spawn } from 'node:child_process'
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const INBOX = '/data/inbox'
const OUTBOX = '/data/outbox'
const PROCESSED = '/data/inbox/.processed'

const AGENT_ID = process.env.AGENT_ID || 'unknown'
const AGENT_NAME = process.env.AGENT_NAME || AGENT_ID
const AGENT_MODEL = process.env.AGENT_MODEL || 'sonnet'
const AGENT_SYSTEM_PROMPT = process.env.AGENT_SYSTEM_PROMPT || ''

const log = (...args) => {
  const ts = new Date().toISOString()
  console.log(`[${ts}] [${AGENT_NAME}]`, ...args)
}

async function ensureDirs() {
  for (const d of [INBOX, OUTBOX, PROCESSED]) {
    await mkdir(d, { recursive: true })
  }
}

function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    const args = ['-p', prompt, '--output-format', 'text', '--model', AGENT_MODEL]
    if (AGENT_SYSTEM_PROMPT) {
      args.push('--append-system-prompt', AGENT_SYSTEM_PROMPT)
    }
    const child = spawn('claude', args, {
      cwd: '/data/workspace',
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => {
      const chunk = d.toString('utf8')
      stdout += chunk
      process.stdout.write(chunk)
    })
    child.stderr.on('data', (d) => {
      const chunk = d.toString('utf8')
      stderr += chunk
      process.stderr.write(chunk)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve(stdout.trim())
      else reject(new Error(`claude exited with ${code}: ${stderr.trim()}`))
    })
  })
}

function parseDelegation(reply) {
  // Convention: agent ends reply with a line like:
  //   DELEGATE-TO: <name-or-id>
  //   SUBJECT: <optional>
  //   BODY:
  //   ... rest is the body for that agent ...
  const match = reply.match(/DELEGATE-TO:\s*(\S+)\s*\n(?:SUBJECT:\s*([^\n]+)\n)?BODY:\s*\n([\s\S]+)$/)
  if (!match) return null
  return {
    to: match[1].trim(),
    subject: match[2]?.trim(),
    body: match[3].trim(),
  }
}

async function processFile(file) {
  const fullPath = join(INBOX, file)
  log(`processing ${file}`)
  let raw
  try {
    raw = await readFile(fullPath, 'utf8')
  } catch (err) {
    log(`failed to read ${file}: ${err.message}`)
    return
  }

  let msg
  try {
    msg = JSON.parse(raw)
  } catch (err) {
    log(`invalid JSON in ${file}: ${err.message}`)
    await rename(fullPath, join(PROCESSED, file + '.invalid'))
    return
  }

  const subject = msg.subject ? `Subject: ${msg.subject}\n\n` : ''
  const fromLine = msg.from ? `From: ${msg.from}\n` : ''
  const prompt = `${fromLine}${subject}${msg.body}`

  let reply
  try {
    reply = await runClaude(prompt)
  } catch (err) {
    log(`claude failed: ${err.message}`)
    const errFile = `${Date.now()}-error-${msg.id || 'msg'}.json`
    await writeFile(
      join(OUTBOX, errFile),
      JSON.stringify(
        {
          to: msg.from || 'orchestrator',
          subject: `Error replying to ${msg.subject || msg.id || ''}`.trim(),
          body: `Agent failed: ${err.message}`,
          inReplyTo: msg.id,
        },
        null,
        2,
      ),
      'utf8',
    )
    await rename(fullPath, join(PROCESSED, file))
    return
  }

  const delegation = parseDelegation(reply)
  if (delegation) {
    const delFile = `${Date.now()}-delegate-${delegation.to}.json`
    await writeFile(
      join(OUTBOX, delFile),
      JSON.stringify(delegation, null, 2),
      'utf8',
    )
    log(`delegated to ${delegation.to}`)
  }

  if (msg.from) {
    const replyFile = `${Date.now()}-reply-${msg.id || 'msg'}.json`
    await writeFile(
      join(OUTBOX, replyFile),
      JSON.stringify(
        {
          to: msg.from,
          subject: msg.subject ? `Re: ${msg.subject}` : 'Reply',
          body: delegation ? reply.replace(/DELEGATE-TO:[\s\S]*$/, '').trim() : reply,
          inReplyTo: msg.id,
        },
        null,
        2,
      ),
      'utf8',
    )
  }

  await rename(fullPath, join(PROCESSED, file))
  log(`done ${file}`)
}

async function tick() {
  let entries
  try {
    entries = await readdir(INBOX, { withFileTypes: true })
  } catch {
    return
  }
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith('.json'))
    .map((e) => e.name)
    .sort()
  for (const file of files) {
    try {
      await processFile(file)
    } catch (err) {
      log(`unhandled error for ${file}: ${err.message}`)
    }
  }
}

async function main() {
  await ensureDirs()
  log(`starting watcher (id=${AGENT_ID}, model=${AGENT_MODEL})`)
  log(`claude version:`)
  await new Promise((resolve) => {
    const c = spawn('claude', ['--version'], { stdio: 'inherit' })
    c.on('close', resolve)
    c.on('error', () => resolve())
  })

  if (!existsSync('/home/agent/.claude') && !existsSync('/home/agent/.claude.json')) {
    log('WARNING: no Claude credentials mounted at /home/agent/.claude')
  }

  // Process anything already in the inbox on startup
  await tick()

  // Poll loop. chokidar would be nicer but adds a dependency to the image;
  // a 2s poll is fine for human-paced delegation.
  const interval = setInterval(() => {
    tick().catch((err) => log(`tick error: ${err.message}`))
  }, 2000)

  const shutdown = (sig) => {
    log(`shutting down on ${sig}`)
    clearInterval(interval)
    process.exit(0)
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((err) => {
  console.error('fatal:', err)
  process.exit(1)
})
