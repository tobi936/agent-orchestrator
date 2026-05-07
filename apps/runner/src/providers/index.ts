import { Sandbox } from 'e2b'
import { tools, executeTool } from '../tools'

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIProvider {
  chat(systemPrompt: string, userMessage: string, sandbox?: Sandbox, log?: (line: string) => void, history?: ChatHistoryMessage[], maxToolIterations?: number): Promise<string>
}

export interface ProviderConfig {
  provider: string
  model: string
}

export function createProvider({ provider, model }: ProviderConfig): AIProvider {
  switch (provider) {
    case 'ollama':    return new OllamaProvider(model)
    case 'anthropic': return new AnthropicProvider(model)
    case 'openai':    return new OpenAIProvider(model)
    default: throw new Error(`Unknown provider "${provider}". Use: ollama | anthropic | openai`)
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Message = { role: string; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string }
type ToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } }

// ── Helpers ───────────────────────────────────────────────────────────────────

async function openAICompatChat(
  baseURL: string,
  apiKey: string,
  model: string,
  messages: Message[],
  extraHeaders: Record<string, string> = {},
  includeTools = false,
): Promise<{ finish_reason: string; message: Message }> {
  const body: Record<string, unknown> = { model, messages }
  if (includeTools) body.tools = tools

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, ...extraHeaders },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
  const data = await res.json() as { choices: { finish_reason: string; message: Message }[] }
  return data.choices[0]
}

async function runToolLoop(
  baseURL: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  sandbox: Sandbox | undefined,
  extraHeaders: Record<string, string> = {},
  log?: (line: string) => void,
  history: ChatHistoryMessage[] = [],
  maxToolIterations = 50,
): Promise<string> {
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user',   content: userMessage },
  ]
  const hasSandbox = !!sandbox

  for (let i = 0; i < maxToolIterations; i++) {
    const { finish_reason, message } = await openAICompatChat(
      baseURL, apiKey, model, messages, extraHeaders, hasSandbox,
    )
    messages.push(message)

    if (finish_reason !== 'tool_calls' || !message.tool_calls?.length) {
      if (message.content) {
        log?.(`[THINK]${message.content}`)
      }
      return message.content ?? ''
    }

    if (message.content) {
      log?.(`[THINK]${message.content}`)
    }

    for (const tc of message.tool_calls) {
      const input = JSON.parse(tc.function.arguments) as Record<string, string>
      log?.(`[TOOL]${JSON.stringify({ type: 'call', name: tc.function.name, input })}`)
      const result = await executeTool(tc.function.name, input, sandbox!)
      const ok = !result.startsWith('Error')
      log?.(`[TOOL]${JSON.stringify({ type: 'result', name: tc.function.name, ok, result: result.slice(0, 2000) })}`)
      messages.push({ role: 'tool', tool_call_id: tc.id, content: result })
    }
  }
  return '[Max tool iterations reached]'
}

// ── Providers ─────────────────────────────────────────────────────────────────

class OllamaProvider implements AIProvider {
  constructor(private model: string) {}
  chat(systemPrompt: string, userMessage: string, sandbox?: Sandbox, log?: (line: string) => void, history?: ChatHistoryMessage[], maxToolIterations?: number) {
    return runToolLoop('https://ollama.com/v1', process.env.OLLAMA_API_KEY ?? '', this.model, systemPrompt, userMessage, sandbox, {}, log, history, maxToolIterations)
  }
}

class OpenAIProvider implements AIProvider {
  constructor(private model: string) {}
  chat(systemPrompt: string, userMessage: string, sandbox?: Sandbox, log?: (line: string) => void, history?: ChatHistoryMessage[], maxToolIterations?: number) {
    return runToolLoop('https://api.openai.com/v1', process.env.OPENAI_API_KEY ?? '', this.model, systemPrompt, userMessage, sandbox, {}, log, history, maxToolIterations)
  }
}

class AnthropicProvider implements AIProvider {
  constructor(private model: string) {}
  async chat(systemPrompt: string, userMessage: string, _sandbox?: Sandbox, _log?: (line: string) => void, history?: ChatHistoryMessage[]): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          ...(history ?? []).map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: userMessage },
        ],
      }),
    })
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
    const data = await res.json() as { content: { type: string; text: string }[] }
    return data.content[0].text
  }
}
