import type { LLMProvider, Provider } from './types.js'
import { claudeProvider } from './claude.js'
import { ollamaProvider } from './ollama.js'
import { openAICompatibleProvider } from './openai-compatible.js'

const registry = new Map<Provider, LLMProvider>([
  ['claude', claudeProvider],
  ['ollama', ollamaProvider],
  ['openai-compatible', openAICompatibleProvider],
])

export function getProvider(name: Provider): LLMProvider {
  const p = registry.get(name)
  if (!p) throw new Error(`Unknown LLM provider: "${name}"`)
  return p
}
