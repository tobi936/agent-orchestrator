const TOKEN_KEY = 'ao_token'
const SERVER_URL_KEY = 'ao_server_url'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

function isElectron(): boolean {
  return 'api' in window
}

function baseUrl(): string {
  const stored = localStorage.getItem(SERVER_URL_KEY)?.replace(/\/$/, '')
  if (stored) return stored
  return isElectron() ? '' : window.location.origin
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${baseUrl()}${path}`, { ...init, headers })

  if (res.status === 401 && token) {
    clearToken()
    window.location.reload()
  }

  return res
}

export const authApi = {
  register: async (email: string, password: string) => {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) throw new Error((await res.json()).error)
    return res.json() as Promise<{ token: string; user: { id: string; email: string; createdAt: string } }>
  },

  login: async (email: string, password: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) throw new Error((await res.json()).error)
    return res.json() as Promise<{ token: string; user: { id: string; email: string; createdAt: string } }>
  },

  me: async () => {
    const res = await apiFetch('/api/auth/me')
    if (!res.ok) throw new Error((await res.json()).error)
    return res.json() as Promise<{ id: string; email: string; createdAt: string }>
  },
}
