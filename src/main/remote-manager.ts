import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import type { LogLine } from '../shared/types.js'

export class RemoteManager extends EventEmitter {
  private processes = new Map<string, ChildProcess>()

  isRunning(agentId: string): boolean {
    return this.processes.has(agentId)
  }

  runTask(agentId: string, prompt: string, systemPrompt?: string): Promise<void> {
    if (this.processes.has(agentId)) {
      return Promise.reject(new Error(`Agent ${agentId} already has a running task`))
    }

    const args = ['--remote', prompt]
    if (systemPrompt) args.push('--append-system-prompt', systemPrompt)

    const child = spawn('claude', args, {
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    this.processes.set(agentId, child)
    this.emitLog(agentId, '[TASK_START]\n', 'stdout')
    this.emit('status', { agentId, status: 'running' })

    child.stdout?.on('data', (chunk: Buffer) => {
      this.emitLog(agentId, chunk.toString('utf8'), 'stdout')
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      this.emitLog(agentId, chunk.toString('utf8'), 'stderr')
    })

    return new Promise((resolve, reject) => {
      child.on('close', (code) => {
        this.processes.delete(agentId)
        if (code === 0) {
          this.emit('status', { agentId, status: 'idle' })
          resolve()
        } else {
          this.emit('status', { agentId, status: 'error' })
          reject(new Error(`claude --remote exited with code ${code}`))
        }
      })
      child.on('error', (err) => {
        this.processes.delete(agentId)
        this.emit('status', { agentId, status: 'error' })
        reject(err)
      })
    })
  }

  stopTask(agentId: string): void {
    const child = this.processes.get(agentId)
    if (child) {
      child.kill('SIGTERM')
      this.processes.delete(agentId)
    }
  }

  stopAll(): void {
    for (const [agentId] of this.processes) {
      this.stopTask(agentId)
    }
  }

  private emitLog(agentId: string, text: string, stream: 'stdout' | 'stderr'): void {
    const line: LogLine = { agentId, stream, ts: new Date().toISOString(), text }
    this.emit('log', line)
  }
}
