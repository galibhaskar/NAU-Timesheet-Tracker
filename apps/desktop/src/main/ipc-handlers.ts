import { ipcMain, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { login, logout, getAuthUser, getAccessToken } from './auth'
import { startScreenshotTimer, stopScreenshotTimer } from './screenshot'
import { startIdleDetection, stopIdleDetection } from './idle-detector'
import { updateTrayStatus } from './tray'
import { enqueue, startWorker, stopWorker, clearSession } from './upload-queue'
import { API_BASE_URL, TICK_INTERVAL_MS } from './constants'

// ─── Session State ────────────────────────────────────────────────────────────

type SessionStatus = 'IDLE' | 'ACTIVE' | 'PAUSED'

interface SessionState {
  status: SessionStatus
  sessionId: string | null
  elapsed: number         // total elapsed wall-clock seconds (including paused time)
  activeSeconds: number   // seconds spent actively working (excludes paused time)
  startedAt: number | null
  lastResumedAt: number | null
}

const sessionState: SessionState = {
  status: 'IDLE',
  sessionId: null,
  elapsed: 0,
  activeSeconds: 0,
  startedAt: null,
  lastResumedAt: null,
}

let tickTimer: ReturnType<typeof setInterval> | null = null
let mainWindowRef: BrowserWindow | null = null

// ─── Tick ─────────────────────────────────────────────────────────────────────

function startTick(mainWindow: BrowserWindow): void {
  stopTick()
  tickTimer = setInterval(() => {
    if (sessionState.status === 'ACTIVE') {
      sessionState.elapsed++
      sessionState.activeSeconds++
    }

    updateTrayStatus(sessionState.status, sessionState.elapsed)

    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('session:tick', {
        elapsed: sessionState.elapsed,
        activeMinutes: Math.floor(sessionState.activeSeconds / 60),
      })
    }
  }, TICK_INTERVAL_MS)
}

function stopTick(): void {
  if (tickTimer !== null) {
    clearInterval(tickTimer)
    tickTimer = null
  }
}

function resetSessionState(): void {
  sessionState.status = 'IDLE'
  sessionState.sessionId = null
  sessionState.elapsed = 0
  sessionState.activeSeconds = 0
  sessionState.startedAt = null
  sessionState.lastResumedAt = null
}

// ─── IPC Handler Registration ─────────────────────────────────────────────────

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow

  // ── auth:login ──────────────────────────────────────────────────────────────
  ipcMain.handle('auth:login', async (_event, payload: { email: string; password: string }) => {
    const { email, password } = payload
    const user = await login(email, password)
    // Start the upload worker on login
    startWorker(mainWindow)
    return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, accessToken: user.accessToken }
  })

  // ── auth:logout ─────────────────────────────────────────────────────────────
  ipcMain.handle('auth:logout', async () => {
    // Abort any active session gracefully
    if (sessionState.status !== 'IDLE' && sessionState.sessionId) {
      stopTick()
      stopScreenshotTimer()
      stopIdleDetection()
      resetSessionState()
    }
    stopWorker()
    await logout()
  })

  // ── auth:check ──────────────────────────────────────────────────────────────
  ipcMain.handle('auth:check', async () => {
    const user = await getAuthUser()
    if (!user) return null
    return { user: { id: user.id, name: user.name, email: user.email, role: user.role } }
  })

  // ── assignments:list ────────────────────────────────────────────────────────
  ipcMain.handle('assignments:list', async () => {
    const accessToken = await getAccessToken()
    if (!accessToken) throw new Error('Not authenticated')

    const { data } = await axios.get<{
      assignments: Array<{
        id: string
        maxWeeklyHours: number
        course: { id: string; name: string; code: string; semester: string; year: number }
        thisWeek: { totalHours: number }
      }>
    }>(`${API_BASE_URL}/api/dashboard/ta`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    return data.assignments
  })

  // ── session:start ───────────────────────────────────────────────────────────
  ipcMain.handle(
    'session:start',
    async (_event, payload: { assignmentId: string; category: string; mode: string }) => {
      const { assignmentId, category, mode } = payload

      if (sessionState.status !== 'IDLE') {
        throw new Error(`Cannot start session: current status is ${sessionState.status}`)
      }

      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Not authenticated')

      const { data } = await axios.post<{ session: { id: string; status: string } }>(
        `${API_BASE_URL}/api/sessions`,
        { assignmentId, category, mode },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      const sessionId = data.session.id
      sessionState.status = 'ACTIVE'
      sessionState.sessionId = sessionId
      sessionState.elapsed = 0
      sessionState.activeSeconds = 0
      sessionState.startedAt = Date.now()
      sessionState.lastResumedAt = Date.now()

      startTick(mainWindow)
      startScreenshotTimer(sessionId, mainWindow)
      startIdleDetection(sessionId, mainWindow)

      updateTrayStatus('ACTIVE', 0)

      return { sessionId }
    }
  )

  // ── session:pause ───────────────────────────────────────────────────────────
  ipcMain.handle('session:pause', async () => {
    if (sessionState.status !== 'ACTIVE' || !sessionState.sessionId) {
      throw new Error('No active session to pause')
    }

    const accessToken = await getAccessToken()
    if (!accessToken) throw new Error('Not authenticated')

    await axios.post(
      `${API_BASE_URL}/api/sessions/${sessionState.sessionId}/pause`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    sessionState.status = 'PAUSED'
    stopScreenshotTimer()
    updateTrayStatus('PAUSED', sessionState.elapsed)
  })

  // ── session:resume ──────────────────────────────────────────────────────────
  ipcMain.handle('session:resume', async () => {
    if (sessionState.status !== 'PAUSED' || !sessionState.sessionId) {
      throw new Error('No paused session to resume')
    }

    const accessToken = await getAccessToken()
    if (!accessToken) throw new Error('Not authenticated')

    await axios.post(
      `${API_BASE_URL}/api/sessions/${sessionState.sessionId}/resume`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    sessionState.status = 'ACTIVE'
    sessionState.lastResumedAt = Date.now()

    if (sessionState.sessionId) {
      startScreenshotTimer(sessionState.sessionId, mainWindow)
    }
    updateTrayStatus('ACTIVE', sessionState.elapsed)
  })

  // ── session:stop ────────────────────────────────────────────────────────────
  ipcMain.handle('session:stop', async (_event, payload: { description: string }) => {
    const { description } = payload

    if (sessionState.status === 'IDLE' || !sessionState.sessionId) {
      throw new Error('No session to stop')
    }

    const accessToken = await getAccessToken()
    if (!accessToken) throw new Error('Not authenticated')

    const sessionId = sessionState.sessionId

    await axios.post(
      `${API_BASE_URL}/api/sessions/${sessionId}/stop`,
      { description },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    stopTick()
    stopScreenshotTimer()
    stopIdleDetection()
    clearSession(sessionId)
    resetSessionState()
    updateTrayStatus('IDLE', 0)
  })

  // ── session:status ──────────────────────────────────────────────────────────
  ipcMain.handle('session:status', () => {
    return {
      status: sessionState.status,
      sessionId: sessionState.sessionId,
      elapsed: sessionState.elapsed,
      activeMinutes: Math.floor(sessionState.activeSeconds / 60),
    }
  })

  // ── photos:upload ───────────────────────────────────────────────────────────
  ipcMain.handle('photos:upload', async (_event, payload: { filePaths: string[] }) => {
    const { filePaths } = payload

    if (sessionState.status === 'IDLE' || !sessionState.sessionId) {
      throw new Error('No active session — cannot upload photos')
    }

    const sessionId = sessionState.sessionId
    const accessToken = await getAccessToken()
    if (!accessToken) throw new Error('Not authenticated')

    let uploadedCount = 0

    for (const filePath of filePaths) {
      try {
        const ext = path.extname(filePath).toLowerCase()
        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg'
        const data = fs.readFileSync(filePath)
        const uploadedAt = new Date().toISOString()

        const { data: presignResponse } = await axios.post<{ uploadUrl: string }>(
          `${API_BASE_URL}/api/sessions/${sessionId}/photos`,
          { uploadedAt },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )

        await axios.put(presignResponse.uploadUrl, data, {
          headers: { 'Content-Type': mimeType, 'Content-Length': data.length },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        })

        uploadedCount++
      } catch (err) {
        console.error(`[ipc] Photo upload failed for ${filePath}:`, err)
        // Enqueue for retry
        try {
          const data = fs.readFileSync(filePath)
          const ext = path.extname(filePath).toLowerCase()
          const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg'
          enqueue({
            type: 'photo',
            sessionId,
            data,
            metadata: { uploadedAt: new Date().toISOString(), mimeType },
          })
        } catch {
          // If we can't even read the file, skip it
        }
      }
    }

    return { uploaded: uploadedCount }
  })

  // ── window:minimize ─────────────────────────────────────────────────────────
  ipcMain.handle('window:minimize', () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.minimize()
    }
  })

  // ── Handle idle auto-pause/resume signals from the renderer (tray) ──────────
  // The idle-detector emits session:auto-paused/auto-resumed to renderer.
  // The renderer may forward a confirmation back if needed. Here we wire up
  // the IPC-level auto handlers so the session state stays in sync.
  ipcMain.handle('session:auto-pause', async () => {
    if (sessionState.status === 'ACTIVE' && sessionState.sessionId) {
      const accessToken = await getAccessToken()
      if (accessToken) {
        try {
          await axios.post(
            `${API_BASE_URL}/api/sessions/${sessionState.sessionId}/pause`,
            {},
            { headers: { Authorization: `Bearer ${accessToken}` } }
          )
        } catch {
          // Best-effort
        }
      }
      sessionState.status = 'PAUSED'
      stopScreenshotTimer()
      updateTrayStatus('PAUSED', sessionState.elapsed)
    }
  })

  ipcMain.handle('session:auto-resume', async () => {
    if (sessionState.status === 'PAUSED' && sessionState.sessionId) {
      const accessToken = await getAccessToken()
      if (accessToken) {
        try {
          await axios.post(
            `${API_BASE_URL}/api/sessions/${sessionState.sessionId}/resume`,
            {},
            { headers: { Authorization: `Bearer ${accessToken}` } }
          )
        } catch {
          // Best-effort
        }
      }
      sessionState.status = 'ACTIVE'
      if (sessionState.sessionId) {
        startScreenshotTimer(sessionState.sessionId, mainWindow)
      }
      updateTrayStatus('ACTIVE', sessionState.elapsed)
    }
  })
}
