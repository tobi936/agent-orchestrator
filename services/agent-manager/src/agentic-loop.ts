// Agentic loop using the Anthropic SDK natively.
// No LangChain — the SDK's tool_use blocks give us everything we need.
// For Ollama/OpenAI-compatible providers, we fall back to a plain chat turn.

import Anthropic from '@anthropic-ai/sdk'
import type { ProviderConfig } from './providers/types.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ToolDefinition {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, { type: string; description?: string }>
    required?: string[]
  }
}

export type ToolHandler = (input: Record<string, unknown>) => Promise<string>

export interface AgentRunOptions {
  config: ProviderConfig
  userMessage: string
  tools?: ToolDefinition[]
  toolHandlers?: Record<string, ToolHandler>
  onToken?: (delta: string) => void
  /** Max agentic turns before forcing a stop */
  maxTurns?: number
}

/**
 * Run a full agentic loop for Claude:
 *   user message → tool calls (optional) → final answer
 *
 * For other providers (ollama, openai-compatible) we do a single-turn chat
 * since those providers may not support tool use natively.
 */
export async function runAgenticLoop(opts: AgentRunOptions): Promise<string> {
  const { config, userMessage, tools = [], toolHandlers = {}, onToken, maxTurns = 10 } = opts

  // Non-Claude providers: single-turn chat via their provider class
  if (config.provider !== 'claude') {
    const { getProvider } = await import('./providers/registry.js')
    const provider = getProvider(config.provider)
    if (onToken) {
      return provider.stream([{ role: 'user', content: userMessage }], config, onToken)
    }
    return provider.chat([{ role: 'user', content: userMessage }], config)
  }

  // ── Claude: full agentic loop with tool use ───────────────────
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ]

  let turns = 0
  let finalAnswer = ''

  while (turns < maxTurns) {
    turns++

    const response = await client.messages.create({
      model: config.model || 'claude-sonnet-4-6',
      max_tokens: 8096,
      system: config.systemPrompt,
      tools: tools.length > 0 ? (tools as Anthropic.Tool[]) : undefined,
      messages,
    })

    // Collect text blocks and stream them
    for (const block of response.content) {
      if (block.type === 'text') {
        finalAnswer += block.text
        onToken?.(block.text)
      }
    }

    // If the model is done, return
    if (response.stop_reason === 'end_turn') break

    // If there are tool calls, execute them and continue the loop
    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content })

      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue
        const handler = toolHandlers[block.name]
        let result: string
        if (handler) {
          try {
            result = await handler(block.input as Record<string, unknown>)
          } catch (err) {
            result = `Error executing tool ${block.name}: ${String(err)}`
          }
        } else {
          result = `Tool "${block.name}" is not registered.`
        }
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
      }

      messages.push({ role: 'user', content: toolResults })
      continue
    }

    break
  }

  return finalAnswer
}
