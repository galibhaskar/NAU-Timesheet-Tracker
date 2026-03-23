import React, { useState } from 'react'
import type { AuthUserPublic } from '../env.d'

interface LoginPageProps {
  onLogin: (user: AuthUserPublic) => void
}

export function LoginPage({ onLogin }: LoginPageProps): React.ReactElement {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValid = email.trim().length > 0 && password.length > 0

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isValid || loading) return

    setLoading(true)
    setError(null)

    try {
      const result = await window.electronAPI.login(email.trim(), password)
      onLogin(result.user)
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Invalid credentials. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 px-6">
      {/* Logo / Branding */}
      <div className="flex flex-col items-center mb-8">
        {/* NAU Shield Icon */}
        <div className="w-16 h-16 bg-nau-blue rounded-2xl flex items-center justify-center shadow-lg mb-4">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16 3L5 8v8c0 6.627 4.925 12.824 11 14 6.075-1.176 11-7.373 11-14V8L16 3z"
              fill="#FFC627"
              stroke="#FFC627"
              strokeWidth="1"
            />
            <path
              d="M10 16l4 4 8-8"
              stroke="#003466"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-nau-blue tracking-tight">NAU Timesheet</h1>
        <p className="text-sm font-semibold text-nau-gold mt-0.5">TA Portal</p>
      </div>

      {/* Login Form */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-gray-100 p-6 flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ta@nau.edu"
            autoComplete="email"
            disabled={loading}
            className="h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-nau-blue/40 focus:border-nau-blue disabled:opacity-60 disabled:bg-gray-50"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={loading}
            className="h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-nau-blue/40 focus:border-nau-blue disabled:opacity-60 disabled:bg-gray-50"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-red-500 text-sm mt-0.5">⚠</span>
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!isValid || loading}
          className={`h-10 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-1 ${
            isValid && !loading
              ? 'bg-nau-blue text-white hover:bg-nau-blue/90 shadow-sm active:scale-[0.98]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <p className="text-xs text-gray-400 mt-6">Northern Arizona University</p>
    </div>
  )
}
