import { contextBridge, ipcRenderer } from 'electron'

// ─── Type Definitions ─────────────────────────────────────────────────────────

export interface SessionStartData {
  assignmentId: string
  category: string
  mode: string
}

export interface AuthUserPublic {
  id: string
  name: string
  email: string
  role: string
}

export interface AssignmentListItem {
  id: string
  maxWeeklyHours: number
  course: { id: string; name: string; code: string; semester: string; year: number }
  thisWeek: { totalHours: number }
}

export interface SessionStatusResult {
  status: 'IDLE' | 'ACTIVE' | 'PAUSED'
  sessionId: string | null
  elapsed: number
  activeMinutes: number
}

export interface TickData {
  elapsed: number
  activeMinutes: number
}

export interface ScreenshotTakenData {
  sessionId: string
  count: number
}

export interface IdleWarningData {
  idleSeconds: number
}

export interface UploadProgressData {
  pending: number
  uploaded: number
}

// ─── Electron API Bridge ──────────────────────────────────────────────────────

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Auth ──────────────────────────────────────────────────────────────────
  login: (email: string, password: string) =>
    ipcRenderer.invoke('auth:login', { email, password }) as Promise<{
      user: AuthUserPublic
      accessToken: string
    }>,

  logout: () => ipcRenderer.invoke('auth:logout') as Promise<void>,

  checkAuth: () =>
    ipcRenderer.invoke('auth:check') as Promise<{ user: AuthUserPublic } | null>,

  // ── Assignments ───────────────────────────────────────────────────────────
  listAssignments: () =>
    ipcRenderer.invoke('assignments:list') as Promise<AssignmentListItem[]>,

  // ── Session ───────────────────────────────────────────────────────────────
  startSession: (data: SessionStartData) =>
    ipcRenderer.invoke('session:start', data) as Promise<{ sessionId: string }>,

  pauseSession: () => ipcRenderer.invoke('session:pause') as Promise<void>,

  resumeSession: () => ipcRenderer.invoke('session:resume') as Promise<void>,

  stopSession: (description: string) =>
    ipcRenderer.invoke('session:stop', { description }) as Promise<void>,

  getSessionStatus: () =>
    ipcRenderer.invoke('session:status') as Promise<SessionStatusResult>,

  // ── Photos ────────────────────────────────────────────────────────────────
  uploadPhotos: (filePaths: string[]) =>
    ipcRenderer.invoke('photos:upload', { filePaths }) as Promise<{ uploaded: number }>,

  // ── Window ────────────────────────────────────────────────────────────────
  minimizeWindow: () => ipcRenderer.invoke('window:minimize') as Promise<void>,

  // ── Event Listeners — Main → Renderer ────────────────────────────────────

  onTick: (cb: (data: TickData) => void) => {
    ipcRenderer.on('session:tick', (_event, data: TickData) => cb(data))
  },

  onScreenshotTaken: (cb: (data: ScreenshotTakenData) => void) => {
    ipcRenderer.on('session:screenshot-taken', (_event, data: ScreenshotTakenData) => cb(data))
  },

  onIdleWarning: (cb: (data: IdleWarningData) => void) => {
    ipcRenderer.on('session:idle-warning', (_event, data: IdleWarningData) => cb(data))
  },

  onAutoPaused: (cb: () => void) => {
    ipcRenderer.on('session:auto-paused', () => cb())
  },

  onAutoResumed: (cb: () => void) => {
    ipcRenderer.on('session:auto-resumed', () => cb())
  },

  onUploadProgress: (cb: (data: UploadProgressData) => void) => {
    ipcRenderer.on('upload:progress', (_event, data: UploadProgressData) => cb(data))
  },

  // Tray-initiated actions (main → renderer requests)
  onTrayPauseRequested: (cb: () => void) => {
    ipcRenderer.on('tray:pause-requested', () => cb())
  },

  onTrayResumeRequested: (cb: () => void) => {
    ipcRenderer.on('tray:resume-requested', () => cb())
  },

  onTrayStopRequested: (cb: () => void) => {
    ipcRenderer.on('tray:stop-requested', () => cb())
  },

  // ── Cleanup ───────────────────────────────────────────────────────────────
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
})
