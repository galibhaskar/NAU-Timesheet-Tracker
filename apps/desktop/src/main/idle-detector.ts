import { powerMonitor, BrowserWindow } from 'electron'
import {
  IDLE_POLL_INTERVAL_MS,
  IDLE_THRESHOLD_SECONDS,
  IDLE_ACTIVE_THRESHOLD_SECONDS,
} from './constants'

type IdleState = 'active' | 'idle'

let idleTimer: ReturnType<typeof setInterval> | null = null
let lastKnownState: IdleState = 'active'

/**
 * Starts polling the system idle time every 15 seconds.
 * - If idle > IDLE_THRESHOLD_SECONDS and session is ACTIVE → emit 'session:auto-paused'
 * - If idle < IDLE_ACTIVE_THRESHOLD_SECONDS and was previously idle → emit 'session:auto-resumed'
 * The ipc-handlers module acts on these events to actually pause/resume via the API.
 */
export function startIdleDetection(sessionId: string, mainWindow: BrowserWindow): void {
  stopIdleDetection()
  lastKnownState = 'active'

  idleTimer = setInterval(() => {
    if (mainWindow.isDestroyed()) {
      stopIdleDetection()
      return
    }

    const idleSeconds = powerMonitor.getSystemIdleTime()

    if (idleSeconds > IDLE_THRESHOLD_SECONDS && lastKnownState === 'active') {
      lastKnownState = 'idle'
      mainWindow.webContents.send('session:auto-paused', { reason: 'idle' })
    } else if (idleSeconds < IDLE_ACTIVE_THRESHOLD_SECONDS && lastKnownState === 'idle') {
      lastKnownState = 'active'
      mainWindow.webContents.send('session:auto-resumed', {})
    } else if (idleSeconds > IDLE_THRESHOLD_SECONDS - 60 && lastKnownState === 'active') {
      // Warn the renderer 1 minute before auto-pause kicks in
      mainWindow.webContents.send('session:idle-warning', { idleSeconds })
    }
  }, IDLE_POLL_INTERVAL_MS)
}

export function stopIdleDetection(): void {
  if (idleTimer !== null) {
    clearInterval(idleTimer)
    idleTimer = null
  }
  lastKnownState = 'active'
}

export function getCurrentIdleState(): IdleState {
  return lastKnownState
}
