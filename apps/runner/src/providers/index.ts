import { Sandbox } from 'e2b'
import { tools, executeTool } from '../tools'

export interface AIProvider {
  chat(systemPrompt: string, userMessage: string, sandbox?: Sandbox): Promise<string>
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
): Promise<string> {
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: userMessage },
  ]
  const hasSandbox = !!sandbox

  for (let i = 0; i < 10; i++) {
    const { finish_reason, message } = await openAICompatChat(
      baseURL, apiKey, model, messages, extraHeaders, hasSandbox,
    )
    messages.push(message)

    if (finish_reason !== 'tool_calls' || !message.tool_calls?.length) {
      return message.content ?? ''
    }

    for (const tc of message.tool_calls) {
      const input = JSON.parse(tc.function.arguments) as Record<string, string>
      const result = await executeTool(tc.function.name, input, sandbox!)
      messages.push({ role: 'tool', tool_call_id: tc.id, content: result })
    }
  }
  return '[Max tool iterations reached]'
}

// ── Providers ─────────────────────────────────────────────────────────────────

class OllamaProvider implements AIProvider {
  constructor(private model: string) {}
  chat(systemPrompt: string, userMessage: string, sandbox?: Sandbox) {
    return runToolLoop(
      'https://ollama.com/v1',
      process.env.OLLAMA_API_KEY ?? '',
      this.model,
      systemPrompt,
      userMessage,
      sandbox,
    )
  }
}

class OpenAIProvider implements AIProvider {
  constructor(private model: string) {}
  async chat(systemPrompt: string, userMessage: string) {
    const { message } = await openAICompatChat(
      'https://api.openai.com/v1',
      process.env.OPENAI_API_KEY ?? '',
      this.model,
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
    )
    return message.content ?? ''
  }
}

class AnthropicProvider implements AIProvider {
  constructor(private model: string) {}
  async chat(systemPrompt: string, userMessage: string): Promise<string> {
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
        messages: [{ role: 'user', content: userMessage }],
      }),
    })
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
    const data = await res.json() as { content: { type: string; text: string }[] }
    return data.content[0].text
  }
}
