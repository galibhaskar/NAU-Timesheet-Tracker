import React, { useEffect, useState } from 'react'
import type { AuthUserPublic } from './env.d'
import { Dashboard } from './pages/Dashboard'
import { LoginPage } from './pages/LoginPage'

type AppState = 'loading' | 'login' | 'dashboard'

export function App(): React.ReactElement {
  const [appState, setAppState] = useState<AppState>('loading')
  const [user, setUser] = useState<AuthUserPublic | null>(null)

  useEffect(() => {
    window.electronAPI.checkAuth().then((result) => {
      if (result?.user) {
        setUser(result.user)
        setAppState('dashboard')
      } else {
        setAppState('login')
      }
    })
  }, [])

  function handleLogin(loggedInUser: AuthUserPublic) {
    setUser(loggedInUser)
    setAppState('dashboard')
  }

  function handleLogout() {
    setUser(null)
    setAppState('login')
  }

  if (appState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-nau-blue gap-3">
        <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
        <p className="text-white/70 text-sm">Loading…</p>
      </div>
    )
  }

  if (appState === 'login') {
    return <LoginPage onLogin={handleLogin} />
  }

  // appState === 'dashboard'
  if (!user) {
    // Should not happen; safety fallback
    return <LoginPage onLogin={handleLogin} />
  }

  return <Dashboard user={user} onLogout={handleLogout} />
}
