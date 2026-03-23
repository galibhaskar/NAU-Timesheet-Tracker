import { useCallback, useEffect, useState } from 'react'

export interface SessionState {
  status: 'IDLE' | 'ACTIVE' | 'PAUSED'
  sessionId: string | null
  elapsed: number
  activeMinutes: number
  screenshotCount: number
  idleSeconds: number
  uploadPending: number
}

const INITIAL_STATE: SessionState = {
  status: 'IDLE',
  sessionId: null,
  elapsed: 0,
  activeMinutes: 0,
  screenshotCount: 0,
  idleSeconds: 0,
  uploadPending: 0,
}

interface UseSessionReturn {
  session: SessionState
  startSession: (data: { assignmentId: string; category: string; mode: string }) => Promise<void>
  pauseSession: () => Promise<void>
  resumeSession: () => Promise<void>
  stopSession: (description: string) => Promise<void>
}

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<SessionState>(INITIAL_STATE)

  // Restore state if app was restarted mid-session
  useEffect(() => {
    window.electronAPI.getSessionStatus().then((result) => {
      if (result.status !== 'IDLE') {
        setSession((prev) => ({
          ...prev,
          status: result.status,
          sessionId: result.sessionId,
          elapsed: result.elapsed,
          activeMinutes: result.activeMinutes,
        }))
      }
    })
  }, [])

  // Register event listeners
  useEffect(() => {
    window.electronAPI.onTick((data) => {
      setSession((prev) => ({
        ...prev,
        elapsed: data.elapsed,
        activeMinutes: data.activeMinutes,
        // Reset idle counter when we get ticks (means session is active)
        idleSeconds: prev.status === 'ACTIVE' ? 0 : prev.idleSeconds,
      }))
    })

    window.electronAPI.onScreenshotTaken((data) => {
      setSession((prev) => ({ ...prev, screenshotCount: data.count }))
    })

    window.electronAPI.onIdleWarning((data) => {
      setSession((prev) => ({ ...prev, idleSeconds: data.idleSeconds }))
    })

    window.electronAPI.onAutoPaused(() => {
      setSession((prev) => ({ ...prev, status: 'PAUSED' }))
    })

    window.electronAPI.onAutoResumed(() => {
      setSession((prev) => ({ ...prev, status: 'ACTIVE', idleSeconds: 0 }))
    })

    window.electronAPI.onUploadProgress((data) => {
      setSession((prev) => ({ ...prev, uploadPending: data.pending }))
    })

    // Tray-initiated actions
    window.electronAPI.onTrayPauseRequested(() => {
      setSession((prev) => ({ ...prev, status: 'PAUSED' }))
    })

    window.electronAPI.onTrayResumeRequested(() => {
      setSession((prev) => ({ ...prev, status: 'ACTIVE', idleSeconds: 0 }))
    })

    window.electronAPI.onTrayStopRequested(() => {
      setSession(INITIAL_STATE)
    })

    return () => {
      window.electronAPI.removeAllListeners('tick')
      window.electronAPI.removeAllListeners('screenshot-taken')
      window.electronAPI.removeAllListeners('idle-warning')
      window.electronAPI.removeAllListeners('auto-paused')
      window.electronAPI.removeAllListeners('auto-resumed')
      window.electronAPI.removeAllListeners('upload-progress')
      window.electronAPI.removeAllListeners('tray-pause-requested')
      window.electronAPI.removeAllListeners('tray-resume-requested')
      window.electronAPI.removeAllListeners('tray-stop-requested')
    }
  }, [])

  const startSession = useCallback(
    async (data: { assignmentId: string; category: string; mode: string }) => {
      const result = await window.electronAPI.startSession(data)
      setSession((prev) => ({
        ...prev,
        status: 'ACTIVE',
        sessionId: result.sessionId,
        elapsed: 0,
        activeMinutes: 0,
        screenshotCount: 0,
        idleSeconds: 0,
      }))
    },
    []
  )

  const pauseSession = useCallback(async () => {
    await window.electronAPI.pauseSession()
    setSession((prev) => ({ ...prev, status: 'PAUSED' }))
  }, [])

  const resumeSession = useCallback(async () => {
    await window.electronAPI.resumeSession()
    setSession((prev) => ({ ...prev, status: 'ACTIVE', idleSeconds: 0 }))
  }, [])

  const stopSession = useCallback(async (description: string) => {
    await window.electronAPI.stopSession(description)
    setSession(INITIAL_STATE)
  }, [])

  return { session, startSession, pauseSession, resumeSession, stopSession }
}
