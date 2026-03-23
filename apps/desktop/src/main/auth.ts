import { app, safeStorage } from 'electron'
import Store from 'electron-store'
import axios from 'axios'
import jwt from 'jsonwebtoken'
import { API_BASE_URL } from './constants'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  accessToken: string
  refreshToken: string
}

interface StoredAuth {
  encryptedTokens: string
}

interface JwtPayload {
  exp?: number
  sub?: string
  email?: string
  role?: string
  name?: string
}

const store = new Store<{ auth?: StoredAuth }>({ name: 'nau-auth' })

function encryptTokens(data: { accessToken: string; refreshToken: string; user: Omit<AuthUser, 'accessToken' | 'refreshToken'> }): string {
  if (!safeStorage.isEncryptionAvailable()) {
    // Fallback: base64 encode (not secure, but functional on systems without keychain)
    return Buffer.from(JSON.stringify(data)).toString('base64')
  }
  return safeStorage.encryptString(JSON.stringify(data)).toString('base64')
}

function decryptTokens(encrypted: string): { accessToken: string; refreshToken: string; user: Omit<AuthUser, 'accessToken' | 'refreshToken'> } | null {
  try {
    const buffer = Buffer.from(encrypted, 'base64')
    if (!safeStorage.isEncryptionAvailable()) {
      return JSON.parse(buffer.toString('utf-8')) as { accessToken: string; refreshToken: string; user: Omit<AuthUser, 'accessToken' | 'refreshToken'> }
    }
    const decrypted = safeStorage.decryptString(buffer)
    return JSON.parse(decrypted) as { accessToken: string; refreshToken: string; user: Omit<AuthUser, 'accessToken' | 'refreshToken'> }
  } catch {
    return null
  }
}

function isTokenExpiringSoon(token: string, thresholdSeconds = 300): boolean {
  try {
    const decoded = jwt.decode(token) as JwtPayload | null
    if (!decoded || typeof decoded.exp !== 'number') return true
    const nowSeconds = Math.floor(Date.now() / 1000)
    return decoded.exp - nowSeconds < thresholdSeconds
  } catch {
    return true
  }
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await axios.post<{
    accessToken: string
    refreshToken: string
    user: { id: string; email: string; name: string; role: string }
  }>(`${API_BASE_URL}/api/auth/token`, { email, password })

  const { accessToken, refreshToken, user } = response.data

  // Validate TA role — only TAs may use the desktop app
  if (user.role !== 'TA') {
    throw new Error('Only Teaching Assistants may use the desktop app.')
  }

  const encrypted = encryptTokens({ accessToken, refreshToken, user })
  store.set('auth', { encryptedTokens: encrypted })

  return { ...user, accessToken, refreshToken }
}

export async function logout(): Promise<void> {
  store.delete('auth')
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const stored = store.get('auth')
  if (!stored?.encryptedTokens) return null

  const data = decryptTokens(stored.encryptedTokens)
  if (!data) {
    store.delete('auth')
    return null
  }

  return { ...data.user, accessToken: data.accessToken, refreshToken: data.refreshToken }
}

export async function getAccessToken(): Promise<string | null> {
  const stored = store.get('auth')
  if (!stored?.encryptedTokens) return null

  const data = decryptTokens(stored.encryptedTokens)
  if (!data) {
    store.delete('auth')
    return null
  }

  if (isTokenExpiringSoon(data.accessToken)) {
    const refreshed = await refreshTokens()
    if (!refreshed) return null
    // Re-read after refresh
    const updated = store.get('auth')
    if (!updated?.encryptedTokens) return null
    const updatedData = decryptTokens(updated.encryptedTokens)
    return updatedData?.accessToken ?? null
  }

  return data.accessToken
}

export async function refreshTokens(): Promise<boolean> {
  const stored = store.get('auth')
  if (!stored?.encryptedTokens) return false

  const data = decryptTokens(stored.encryptedTokens)
  if (!data) {
    store.delete('auth')
    return false
  }

  try {
    const response = await axios.post<{
      accessToken: string
      refreshToken: string
    }>(`${API_BASE_URL}/api/auth/refresh`, { refreshToken: data.refreshToken })

    const { accessToken, refreshToken } = response.data
    const encrypted = encryptTokens({ accessToken, refreshToken, user: data.user })
    store.set('auth', { encryptedTokens: encrypted })
    return true
  } catch {
    // Refresh failed — clear stored auth
    store.delete('auth')
    return false
  }
}

// Ensure userData directory exists (called on app ready)
export function initAuthStore(): void {
  // electron-store handles directory creation automatically
  // This is a no-op but exists as a hook for future setup
  void app.getPath('userData')
}
