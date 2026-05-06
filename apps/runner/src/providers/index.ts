 export interface AIProvider {
   chat(systemPrompt: string, userMessage: string): Promise<string>
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
   constructor(private model: string) {}
   async chat(systemPrompt: string, userMessage: string) {
     return openAICompatChat(
       'https://ollama.com/v1',
       process.env.OLLAMA_API_KEY ?? '',
       this.model,
       systemPrompt,
       userMessage
     )
   }
 }
 
 class OpenAIProvider implements AIProvider {
   constructor(private model: string) {}
   async chat(systemPrompt: string, userMessage: string) {
     return openAICompatChat(
       'https://api.openai.com/v1',
       process.env.OPENAI_API_KEY ?? '',
       this.model,
       systemPrompt,
       userMessage
     )
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
