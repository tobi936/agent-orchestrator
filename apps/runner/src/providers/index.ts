import { Sandbox } from 'e2b'
import { sandboxTools, orchestrationTools, ghTools, executeSandboxTool, executeGhTool } from '../tools'
import { getCurrentKey, switchToNextKey, getTotalKeys } from '../ollamaKeys'

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export type CustomToolHandler = (name: string, input: Record<string, string>) => Promise<string>

export interface AIProvider {
  chat(
    systemPrompt: string,
    userMessage: string,
    sandbox: Sandbox | null,
    log?: (line: string) => void,
    history?: ChatHistoryMessage[],
    maxToolIterations?: number,
    customToolHandler?: CustomToolHandler,
    allowedTools?: string[],
  ): Promise<string>
}

export interface ProviderConfig {
  provider: string
  model: string
}

export function createProvider({ provider, model }: ProviderConfig): AIProvider {
  switch (provider) {
    case 'ollama':     return new OllamaProvider(model)
    case 'anthropic':  return new AnthropicProvider(model)
    case 'openai':     return new OpenAIProvider(model)
    default: throw new Error(`Unknown provider "${provider}". Use: ollama | anthropic | openai`)
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Message = { role: string; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string }
type ToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } }

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(url: string, init: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, init)
    if (res.ok) return res
    const isRetryable = res.status >= 500 || res.status === 429
    if (isRetryable && attempt < maxRetries - 1) {
      await sleep(1000 * Math.pow(2, attempt))
      continue
    }
    throw new Error(`${res.status}: ${await res.text()}`)
  }
  throw new Error('Max retries exceeded')
}

async function fetchWithOllamaKeyRotation(url: string, init: RequestInit): Promise<Response> {
  const maxAttempts = Math.max(getTotalKeys(), 1)
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const currentKey = getCurrentKey()
    const headers = {
      ...(init.headers as Record<string, string>),
      Authorization: `Bearer ${currentKey}`,
    }
    const res = await fetch(url, { ...init, headers })
    if (res.ok) return res
    if (res.status === 429 && getTotalKeys() > 1) {
      const switched = switchToNextKey()
      if (switched) continue
    }
    if (res.status >= 500 || res.status === 429) {
      await sleep(1000 * Math.pow(2, attempt))
      continue
    }
    throw new Error(`${res.status}: ${await res.text()}`)
  }
  throw new Error('All Ollama API keys exhausted')
}

async function openAICompatChat(
  baseURL: string,
  apiKey: string,
  model: string,
  messages: Message[],
  toolList: unknown[],
  extraHeaders: Record<string, string> = {},
  useKeyRotation = false,
): Promise<{ finish_reason: string; message: Message }> {
  const body: Record<string, unknown> = { model, messages }
  if (toolList.length > 0) body.tools = toolList

  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, ...extraHeaders },
    body: JSON.stringify(body),
  }

  const res = useKeyRotation
    ? await fetchWithOllamaKeyRotation(`${baseURL}/chat/completions`, init)
    : await fetchWithRetry(`${baseURL}/chat/completions`, init)

  const data = await res.json() as { choices: { finish_reason: string; message: Message }[] }
  return data.choices[0]
}

function filterTools<T extends { function: { name: string } }>(tools: T[], allowedTools?: string[]): T[] {
  if (!allowedTools || allowedTools.length === 0) return tools
  return tools.filter((t) => allowedTools.includes(t.function.name))
}

async function runToolLoop(
  baseURL: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  sandbox: Sandbox | null,
  extraHeaders: Record<string, string> = {},
  log?: (line: string) => void,
  history: ChatHistoryMessage[] = [],
  maxToolIterations = 50,
  customToolHandler?: CustomToolHandler,
  allowedTools?: string[],
  useKeyRotation = false,
): Promise<string> {
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user',   content: userMessage },
  ]

  const toolList = filterTools([
    ...(sandbox ? sandboxTools : []),
    ...orchestrationTools,
    ...ghTools,
  ], allowedTools)

  for (let i = 0; i < maxToolIterations; i++) {
    const { finish_reason, message } = await openAICompatChat(
      baseURL, apiKey, model, messages, toolList, extraHeaders, useKeyRotation,
    )
    messages.push(message)

    if (finish_reason !== 'tool_calls' || !message.tool_calls?.length) {
      if (message.content) log?.(`[THINK]${message.content}`)
      return message.content ?? ''
    }

    if (message.content) log?.(`[THINK]${message.content}`)

    for (const tc of message.tool_calls) {
      const input = JSON.parse(tc.function.arguments) as Record<string, string>
      log?.(`[TOOL]${JSON.stringify({ type: 'call', name: tc.function.name, input })}`)

      let result: string
      const isOrchestrationTool = ['route_task', 'ask_human', 'create_agent', 'update_agent'].includes(tc.function.name)
      if (customToolHandler && isOrchestrationTool) {
        result = await customToolHandler(tc.function.name, input)
      } else if (tc.function.name.startsWith('gh_')) {
        result = await executeGhTool(tc.function.name, input as Record<string, string | number>)
      } else if (sandbox) {
        result = await executeSandboxTool(tc.function.name, input, sandbox)
      } else {
        result = `Tool ${tc.function.name} not available without sandbox`
      }

      const ok = !result.startsWith('Error') && !result.startsWith('Unknown tool') && !result.startsWith('Tool ')
      log?.(`[TOOL]${JSON.stringify({ type: 'result', name: tc.function.name, ok, result: result.slice(0, 2000) })}`)
      messages.push({ role: 'tool', tool_call_id: tc.id, content: result } as Message)
    }
  }
  return '[Max tool iterations reached]'
}

// ── Anthropic (native API with tool support) ──────────────────────────────────

type AnthropicContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, string> }

async function runAnthropicToolLoop(
  model: string,
  systemPrompt: string,
  userMessage: string,
  sandbox: Sandbox | null,
  log?: (line: string) => void,
  history: ChatHistoryMessage[] = [],
  maxToolIterations = 50,
  customToolHandler?: CustomToolHandler,
  allowedTools?: string[],
): Promise<string> {
  const toolList = filterTools([
    ...(sandbox ? sandboxTools : []),
    ...orchestrationTools,
    ...ghTools,
  ], allowedTools).map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }))

  const messages: { role: string; content: string | AnthropicContent[] }[] = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage },
  ]

  for (let i = 0; i < maxToolIterations; i++) {
    const res = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        tools: toolList,
      }),
    })

    const data = await res.json() as { stop_reason: string; content: AnthropicContent[] }

    const text = data.content.find((c) => c.type === 'text')
    if (text?.type === 'text' && text.text) log?.(`[THINK]${text.text}`)

    if (data.stop_reason !== 'tool_use') {
      return text?.type === 'text' ? text.text : ''
    }

    messages.push({ role: 'assistant', content: data.content })

    const toolResults: AnthropicContent[] = []
    for (const block of data.content) {
      if (block.type !== 'tool_use') continue
      log?.(`[TOOL]${JSON.stringify({ type: 'call', name: block.name, input: block.input })}`)

      let result: string
      const isOrchestrationTool = ['route_task', 'ask_human', 'create_agent', 'update_agent'].includes(block.name)
      if (customToolHandler && isOrchestrationTool) {
        result = await customToolHandler(block.name, block.input)
      } else if (block.name.startsWith('gh_')) {
        result = await executeGhTool(block.name, block.input as Record<string, string | number>)
      } else if (sandbox) {
        result = await executeSandboxTool(block.name, block.input, sandbox)
      } else {
        result = `Tool ${block.name} not available without sandbox`
      }

      const ok = !result.startsWith('Error') && !result.startsWith('Unknown tool') && !result.startsWith('Tool ')
      log?.(`[TOOL]${JSON.stringify({ type: 'result', name: block.name, ok, result: result.slice(0, 2000) })}`)
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result } as unknown as AnthropicContent)
    }
    messages.push({ role: 'user', content: toolResults })
  }
  return '[Max tool iterations reached]'
}

// ── Providers ─────────────────────────────────────────────────────────────────

class OllamaProvider implements AIProvider {
  constructor(private model: string) {}
  chat(systemPrompt: string, userMessage: string, sandbox: Sandbox | null, log?: (line: string) => void, history?: ChatHistoryMessage[], maxToolIterations?: number, customToolHandler?: CustomToolHandler, allowedTools?: string[]) {
    return runToolLoop('https://ollama.com/v1', getCurrentKey(), this.model, systemPrompt, userMessage, sandbox, {}, log, history, maxToolIterations, customToolHandler, allowedTools, true)
  }
}

class OpenAIProvider implements AIProvider {
  constructor(private model: string) {}
  chat(systemPrompt: string, userMessage: string, sandbox: Sandbox | null, log?: (line: string) => void, history?: ChatHistoryMessage[], maxToolIterations?: number, customToolHandler?: CustomToolHandler, allowedTools?: string[]) {
    return runToolLoop('https://api.openai.com/v1', process.env.OPENAI_API_KEY ?? '', this.model, systemPrompt, userMessage, sandbox, {}, log, history, maxToolIterations, customToolHandler, allowedTools)
  }
}

class AnthropicProvider implements AIProvider {
  constructor(private model: string) {}
  chat(systemPrompt: string, userMessage: string, sandbox: Sandbox | null, log?: (line: string) => void, history?: ChatHistoryMessage[], maxToolIterations?: number, customToolHandler?: CustomToolHandler, allowedTools?: string[]) {
    return runAnthropicToolLoop(this.model, systemPrompt, userMessage, sandbox, log, history, maxToolIterations, customToolHandler, allowedTools)
  }
}
