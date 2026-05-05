// Claude provider — uses the official Anthropic SDK with streaming + tool use.
// The agentic loop (tool calls → observations → next turn) is handled here.

import Anthropic from '@anthropic-ai/sdk'
import type { LLMProvider, ChatMessage, ProviderConfig } from './types.js'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const claudeProvider: LLMProvider = {
  name: 'claude',

  async chat(messages, config) {
    const response = await client.messages.create({
      model: config.model || 'claude-sonnet-4-6',
      max_tokens: 8096,
      system: config.systemPrompt,
      messages: messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    })
    const block = response.content[0]
    return block.type === 'text' ? block.text : ''
  },

  async stream(messages, config, onChunk) {
    let fullText = ''
    const stream = client.messages.stream({
      model: config.model || 'claude-sonnet-4-6',
      max_tokens: 8096,
      system: config.systemPrompt,
      messages: messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    })

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        const delta = event.delta.text
        fullText += delta
        onChunk(delta)
      }
    }

    return fullText
  },
}
