import Docker from 'dockerode'
import path from 'path'

const docker = new Docker()

const WORKER_IMAGE = 'agent-worker'

export async function startAgentContainer(
  agentId: string,
  systemPrompt: string
): Promise<string> {
  const apiUrl = process.env.API_URL ?? 'http://host.docker.internal:3000'
  const ollamaKey = process.env.OLLAMA_API_KEY ?? ''
  const ollamaModel = process.env.OLLAMA_MODEL ?? 'llama3.2'

  // base64-encode system prompt to safely pass multiline strings as env var
  const systemPromptB64 = Buffer.from(systemPrompt).toString('base64')

  const container = await docker.createContainer({
    Image: WORKER_IMAGE,
    name: `agent-${agentId}`,
    Env: [
      `AGENT_ID=${agentId}`,
      `API_URL=${apiUrl}`,
      `OLLAMA_API_KEY=${ollamaKey}`,
      `OLLAMA_MODEL=${ollamaModel}`,
      `SYSTEM_PROMPT_B64=${systemPromptB64}`,
    ],
    HostConfig: {
      ExtraHosts: ['host.docker.internal:host-gateway'],
      AutoRemove: true,
    },
  })

  await container.start()
  return container.id
}

export async function stopAgentContainer(containerId: string): Promise<void> {
  try {
    const container = docker.getContainer(containerId)
    await container.stop({ t: 5 })
  } catch (err: unknown) {
    // container already stopped or removed — ignore
    if (err instanceof Error && !err.message.includes('No such container')) {
      throw err
    }
  }
}

export async function streamContainerLogs(
  containerId: string,
  onData: (line: string) => void,
  onEnd: () => void
): Promise<void> {
  const container = docker.getContainer(containerId)
  const logStream = await container.logs({
    follow: true,
    stdout: true,
    stderr: true,
    timestamps: true,
  })

  // Docker multiplexes stdout/stderr with an 8-byte header — strip it
  container.modem.demuxStream(
    logStream as unknown as NodeJS.ReadableStream,
    {
      write: (chunk: Buffer) => onData(chunk.toString('utf8').trimEnd()),
    } as unknown as NodeJS.WritableStream,
    {
      write: (chunk: Buffer) => onData(chunk.toString('utf8').trimEnd()),
    } as unknown as NodeJS.WritableStream
  )

  ;(logStream as unknown as NodeJS.ReadableStream).on('end', onEnd)
}
