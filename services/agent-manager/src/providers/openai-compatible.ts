// OpenAI-compatible provider — works with OpenAI, Together AI, Groq, LM Studio, etc.
// Anything that speaks the /v1/chat/completions API.

import type { LLMProvider, ChatMessage, ProviderConfig } from './types.js'

export const openAICompatibleProvider: LLMProvider = {
  name: 'openai-compatible',

  async chat(messages, config) {
    const baseUrl = config.baseUrl ?? 'https://api.openai.com'
    const body = {
      model: config.model,
      stream: false,
      messages: [
        { role: 'system', content: config.systemPrompt },
        ...messages.filter((m) => m.role !== 'system'),
      ],
    }

    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey ?? ''}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Provider error ${res.status}: ${await res.text()}`)
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    return json.choices?.[0]?.message?.content ?? ''
  },

  async stream(messages, config, onChunk) {
    const baseUrl = config.baseUrl ?? 'https://api.openai.com'
    const body = {
      model: config.model,
      stream: true,
      messages: [
        { role: 'system', content: config.systemPrompt },
        ...messages.filter((m) => m.role !== 'system'),
      ],
    }

    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey ?? ''}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Provider error ${res.status}: ${await res.text()}`)

    let fullText = ''
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n')) {
        const trimmed = line.replace(/^data:\s*/, '').trim()
        if (!trimmed || trimmed === '[DONE]') continue
        try {
          const chunk = JSON.parse(trimmed) as {
            choices?: Array<{ delta?: { content?: string } }>
          }
          const delta = chunk.choices?.[0]?.delta?.content ?? ''
          if (delta) { fullText += delta; onChunk(delta) }
        } catch { /* partial chunk */ }
      }
    }

    return fullText
  },
}
