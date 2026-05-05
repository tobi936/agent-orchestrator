// Shared provider interface — all LLM backends implement this.
// Switching providers only changes the Agent.provider field in the DB;
// the rest of the orchestration (Docker, messaging, status) stays identical.

export type Provider = 'claude' | 'ollama' | 'openai-compatible'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ProviderConfig {
  provider: Provider
  model: string
  /** Required for ollama / openai-compatible, e.g. http://localhost:11434 */
  baseUrl?: string
  /** API key for openai-compatible providers */
  apiKey?: string
  systemPrompt: string
}

export interface LLMProvider {
  readonly name: Provider

  /** Send a chat turn and return the assistant reply */
  chat(messages: ChatMessage[], config: ProviderConfig): Promise<string>

  /** Stream a chat turn, calling onChunk for each text delta */
  stream(
    messages: ChatMessage[],
    config: ProviderConfig,
    onChunk: (delta: string) => void,
  ): Promise<string>
}
