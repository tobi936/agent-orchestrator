import { useState, useEffect, useCallback } from 'react'
import { getToken, setToken, clearToken, apiFetch } from '../lib/http'

const SERVER_URL_KEY = 'ao_server_url'

export function getServerUrl(): string {
  return localStorage.getItem(SERVER_URL_KEY) ?? ''
}

export function setServerUrl(url: string): void {
  localStorage.setItem(SERVER_URL_KEY, url.replace(/\/$/, ''))
}

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated'

export function useAuth() {
  const [state, setState] = useState<AuthState>('loading')
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setState('unauthenticated')
      return
    }
    apiFetch('/api/auth/me')
      .then(async (res) => {
        if (res.ok) {
          const user = await res.json() as { email: string }
          setEmail(user.email)
          setState('authenticated')
        } else {
          clearToken()
          setState('unauthenticated')
        }
      })
      .catch(() => setState('unauthenticated'))
  }, [])

  const login = useCallback(async (emailInput: string, password: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emailInput, password }),
    })
    if (!res.ok) {
      const body = await res.json() as { error: string }
      throw new Error(body.error === 'unauthorized' ? 'Ungültige E-Mail-Adresse oder Passwort' : (body.error ?? 'Login fehlgeschlagen'))
    }
    const body = await res.json() as { token: string; user: { email: string } }
    setToken(body.token)
    setEmail(body.user.email)
    setState('authenticated')
  }, [])

  const register = useCallback(async (emailInput: string, password: string, serverUrl: string) => {
    setServerUrl(serverUrl)
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: emailInput, password }),
    })
    if (!res.ok) {
      const body = await res.json() as { error: string }
      throw new Error(body.error ?? 'Registrierung fehlgeschlagen')
    }
    const body = await res.json() as { token: string; user: { email: string } }
    setToken(body.token)
    setEmail(body.user.email)
    setState('authenticated')
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setState('unauthenticated')
    setEmail(null)
  }, [])

  return { state, email, login, register, logout }
}
