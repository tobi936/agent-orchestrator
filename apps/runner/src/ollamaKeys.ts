// Manages multiple Ollama API keys with auto-rotation on quota exhaustion (429).
// Keys are loaded from OLLAMA_API_KEYS (comma-separated) or OLLAMA_API_KEY.

function loadKeys(): string[] {
  const multi = process.env.OLLAMA_API_KEYS
  if (multi) return multi.split(',').map((k) => k.trim()).filter(Boolean)
  const single = process.env.OLLAMA_API_KEY
  return single ? [single] : []
}

let keys = loadKeys()
let currentIndex = 0

export function getCurrentKey(): string {
  return keys[currentIndex] ?? ''
}

export function getCurrentKeyIndex(): number {
  return currentIndex
}

export function getTotalKeys(): number {
  return keys.length
}

export function switchToNextKey(): boolean {
  if (keys.length <= 1) return false
  currentIndex = (currentIndex + 1) % keys.length
  return true
}

export function switchToKey(index: number): boolean {
  if (index < 0 || index >= keys.length) return false
  currentIndex = index
  return true
}

export function getKeyStatus(): { total: number; current: number; maskedKeys: string[] } {
  return {
    total: keys.length,
    current: currentIndex,
    maskedKeys: keys.map((k) => k.slice(0, 6) + '…' + k.slice(-4)),
  }
}
