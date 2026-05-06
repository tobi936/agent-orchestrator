export interface AIProvider {
  chat(systemPrompt: string, userMessage: string): Promise<string>
}

export function createProvider(): AIProvider {
  const provider = process.env.PROVIDER ?? 'ollama'
  switch (provider) {
    case 'ollama':    return new OllamaProvider()
    case 'anthropic': return new AnthropicProvider()
    case 'openai':    return new OpenAIProvider()
    default: throw new Error(`Unknown PROVIDER="${provider}". Use: ollama | anthropic | openai`)
  }
}

// ── Shared helper ────────────────────────────────────────────────────────────

async function openAICompatChat(
  baseURL: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  extraHeaders: Record<string, string> = {}
): Promise<string> {
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
    }),
  })
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
  const data = await res.json() as { choices: { message: { content: string } }[] }
  return data.choices[0].message.content
}

// ── Providers ────────────────────────────────────────────────────────────────

class OllamaProvider implements AIProvider {
  async chat(systemPrompt: string, userMessage: string) {
    return openAICompatChat(
      'https://api.ollama.com/v1',
      process.env.OLLAMA_API_KEY ?? '',
      process.env.OLLAMA_MODEL ?? 'llama3.2',
      systemPrompt,
      userMessage
    )
  }
}

class OpenAIProvider implements AIProvider {
  async chat(systemPrompt: string, userMessage: string) {
    return openAICompatChat(
      'https://api.openai.com/v1',
      process.env.OPENAI_API_KEY ?? '',
      process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      systemPrompt,
      userMessage
    )
  }
}

class AnthropicProvider implements AIProvider {
  async chat(systemPrompt: string, userMessage: string): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001',
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
