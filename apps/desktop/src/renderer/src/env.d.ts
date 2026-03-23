/**
 * Type declarations for the Electron contextBridge API exposed to the renderer.
 * Keep this in sync with src/preload/index.ts.
 */

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

export interface ElectronAPI {
  // Auth
  login: (email: string, password: string) => Promise<{ user: AuthUserPublic; accessToken: string }>
  logout: () => Promise<void>
  checkAuth: () => Promise<{ user: AuthUserPublic } | null>

  // Assignments
  listAssignments: () => Promise<AssignmentListItem[]>

  // Session
  startSession: (data: SessionStartData) => Promise<{ sessionId: string }>
  pauseSession: () => Promise<void>
  resumeSession: () => Promise<void>
  stopSession: (description: string) => Promise<void>
  getSessionStatus: () => Promise<SessionStatusResult>

  // Photos
  uploadPhotos: (filePaths: string[]) => Promise<{ uploaded: number }>

  // Window
  minimizeWindow: () => Promise<void>

  // Event listeners
  onTick: (cb: (data: TickData) => void) => void
  onScreenshotTaken: (cb: (data: ScreenshotTakenData) => void) => void
  onIdleWarning: (cb: (data: IdleWarningData) => void) => void
  onAutoPaused: (cb: () => void) => void
  onAutoResumed: (cb: () => void) => void
  onUploadProgress: (cb: (data: UploadProgressData) => void) => void

  // Tray-initiated actions
  onTrayPauseRequested: (cb: () => void) => void
  onTrayResumeRequested: (cb: () => void) => void
  onTrayStopRequested: (cb: () => void) => void

  // Cleanup
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
