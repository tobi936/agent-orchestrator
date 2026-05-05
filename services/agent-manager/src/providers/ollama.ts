// Ollama provider — calls local Ollama REST API (OpenAI-compatible /api/chat).
// No SDK needed: plain fetch. Works with any model pulled in Ollama.

import type { LLMProvider, ChatMessage, ProviderConfig } from './types.js'

export const ollamaProvider: LLMProvider = {
  name: 'ollama',

  async chat(messages, config) {
    const baseUrl = config.baseUrl ?? 'http://localhost:11434'
    const body = {
      model: config.model,
      stream: false,
      messages: [
        { role: 'system', content: config.systemPrompt },
        ...messages.filter((m) => m.role !== 'system'),
      ],
    }

    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`)
    const json = (await res.json()) as { message?: { content?: string } }
    return json.message?.content ?? ''
  },

  async stream(messages, config, onChunk) {
    const baseUrl = config.baseUrl ?? 'http://localhost:11434'
    const body = {
      model: config.model,
      stream: true,
      messages: [
        { role: 'system', content: config.systemPrompt },
        ...messages.filter((m) => m.role !== 'system'),
      ],
    }

    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`)

    let fullText = ''
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n').filter(Boolean)) {
        try {
          const chunk = JSON.parse(line) as { message?: { content?: string }; done?: boolean }
          const delta = chunk.message?.content ?? ''
          if (delta) { fullText += delta; onChunk(delta) }
        } catch { /* partial line, skip */ }
      }
    }

    return fullText
  },
}
