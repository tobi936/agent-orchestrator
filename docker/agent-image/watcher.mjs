#!/usr/bin/env node
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

function handleStreamEvent(event) {
  if (event.type === 'assistant' && Array.isArray(event.message?.content)) {
    for (const block of event.message.content) {
      if (block.type === 'thinking' && block.thinking) {
        const preview = block.thinking.length > 500
          ? block.thinking.slice(0, 500).replace(/\n+/g, ' ') + '…'
          : block.thinking.replace(/\n+/g, ' ')
        process.stdout.write(`[THINKING] ${preview}\n`)
      } else if (block.type === 'text' && block.text) {
        process.stdout.write(block.text)
      } else if (block.type === 'tool_use') {
        const inputStr = JSON.stringify(block.input)
        const short = inputStr.length > 150 ? inputStr.slice(0, 150) + '…' : inputStr
        process.stdout.write(`[TOOL] ${block.name}: ${short}\n`)
      }
    }
  } else if (event.type === 'user' && Array.isArray(event.message?.content)) {
    for (const block of event.message.content) {
      if (block.type === 'tool_result') {
        const raw = Array.isArray(block.content)
          ? block.content.filter(c => c.type === 'text').map(c => c.text).join('')
          : String(block.content ?? '')
        if (raw.trim()) {
          const preview = raw.length > 400 ? raw.slice(0, 400) + '…' : raw
          process.stdout.write(`[RESULT] ${preview.trim()}\n`)
        }
      }
    }
  }
}

function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    const args = ['-p', prompt, '--output-format', 'stream-json', '--model', AGENT_MODEL]
    if (AGENT_SYSTEM_PROMPT) {
      args.push('--append-system-prompt', AGENT_SYSTEM_PROMPT)
    }
    const child = spawn('claude', args, {
      cwd: '/data/workspace',
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let lineBuffer = ''
    let finalResult = ''
    let stderr = ''

    child.stdout.on('data', (d) => {
      lineBuffer += d.toString('utf8')
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const event = JSON.parse(line)
          handleStreamEvent(event)
          if (event.type === 'result' && event.result) {
            finalResult = event.result
          }
        } catch {
          process.stdout.write(line + '\n')
        }
      }
    })

    child.stderr.on('data', (d) => {
      const chunk = d.toString('utf8')
      stderr += chunk
      process.stderr.write(chunk)
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve(finalResult)
      else reject(new Error(`claude exited with ${code}: ${stderr.trim()}`))
    })
  })
}

function parseDelegation(reply) {
  const match = reply.match(/DELEGATE-TO:\s*(\S+)\s*\n(?:SUBJECT:\s*([^\n]+)\n)?BODY:\s*\n([\s\S]+)$/)
  if (!match) return null
  return { to: match[1].trim(), subject: match[2]?.trim(), body: match[3].trim() }
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

  process.stdout.write('[TASK_START]\n')
  let reply
  try {
    reply = await runClaude(prompt)
  } catch (err) {
    log(`claude failed: ${err.message}`)
    const errFile = `${Date.now()}-error-${msg.id || 'msg'}.json`
    await writeFile(
      join(OUTBOX, errFile),
      JSON.stringify({ to: msg.from || 'orchestrator', subject: `Error replying to ${msg.subject || msg.id || ''}`.trim(), body: `Agent failed: ${err.message}`, inReplyTo: msg.id }, null, 2),
      'utf8',
    )
    await rename(fullPath, join(PROCESSED, file))
    return
  }

  const delegation = parseDelegation(reply)
  if (delegation) {
    const delFile = `${Date.now()}-delegate-${delegation.to}.json`
    await writeFile(join(OUTBOX, delFile), JSON.stringify(delegation, null, 2), 'utf8')
    log(`delegated to ${delegation.to}`)
  }

  if (msg.from) {
    const replyFile = `${Date.now()}-reply-${msg.id || 'msg'}.json`
    await writeFile(
      join(OUTBOX, replyFile),
      JSON.stringify({ to: msg.from, subject: msg.subject ? `Re: ${msg.subject}` : 'Reply', body: delegation ? reply.replace(/DELEGATE-TO:[\s\S]*$/, '').trim() : reply, inReplyTo: msg.id }, null, 2),
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
  const files = entries.filter(e => e.isFile() && e.name.endsWith('.json')).map(e => e.name).sort()
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
  process.stdout.write('[SESSION_START]\n')
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

  await tick()

  const interval = setInterval(() => {
    tick().catch(err => log(`tick error: ${err.message}`))
  }, 2000)

  const shutdown = (sig) => {
    log(`shutting down on ${sig}`)
    clearInterval(interval)
    process.exit(0)
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch(err => {
  console.error('fatal:', err)
  process.exit(1)
})
