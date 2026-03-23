import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import path from 'path'

let trayInstance: Tray | null = null
let mainWindowRef: BrowserWindow | null = null

type SessionUiStatus = 'IDLE' | 'ACTIVE' | 'PAUSED'

let currentStatus: SessionUiStatus = 'IDLE'
let currentElapsed = 0

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

function buildTrayIcon(): Electron.NativeImage {
  // Attempt to load the bundled resources icon; fall back to an empty image
  try {
    const iconPath = path.join(process.resourcesPath ?? '', 'resources', 'icon.png')
    const img = nativeImage.createFromPath(iconPath)
    if (!img.isEmpty()) return img
  } catch {
    // ignore
  }

  // Fallback: create a 16×16 transparent placeholder
  // In production this would be a real .icns / .ico / .png
  return nativeImage.createEmpty()
}

function buildContextMenu(status: SessionUiStatus): Electron.Menu {
  const isSessionActive = status === 'ACTIVE' || status === 'PAUSED'

  return Menu.buildFromTemplate([
    {
      label: 'Show NAU Timesheet',
      click: () => {
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.show()
          mainWindowRef.focus()
        }
      },
    },
    { type: 'separator' },
    {
      label: status === 'PAUSED' ? 'Resume Session' : 'Pause Session',
      enabled: isSessionActive,
      click: () => {
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.show()
          mainWindowRef.focus()
          // Trigger action from renderer side by sending a message
          if (status === 'PAUSED') {
            mainWindowRef.webContents.send('tray:resume-requested')
          } else {
            mainWindowRef.webContents.send('tray:pause-requested')
          }
        }
      },
    },
    {
      label: 'Stop Session',
      enabled: isSessionActive,
      click: () => {
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.show()
          mainWindowRef.focus()
          mainWindowRef.webContents.send('tray:stop-requested')
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])
}

export function createTray(mainWindow: BrowserWindow): Tray {
  mainWindowRef = mainWindow

  const icon = buildTrayIcon()
  const tray = new Tray(icon)
  tray.setToolTip('NAU Timesheet — Idle')
  tray.setContextMenu(buildContextMenu('IDLE'))

  // Single click on tray icon shows the window
  tray.on('click', () => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      if (mainWindowRef.isVisible()) {
        mainWindowRef.focus()
      } else {
        mainWindowRef.show()
        mainWindowRef.focus()
      }
    }
  })

  trayInstance = tray
  return tray
}

export function updateTrayStatus(status: SessionUiStatus, elapsed: number): void {
  if (!trayInstance) return

  currentStatus = status
  currentElapsed = elapsed

  const elapsedStr = status !== 'IDLE' ? formatElapsed(elapsed) : ''
  const tooltipParts = ['NAU Timesheet']
  if (status === 'ACTIVE') tooltipParts.push(`Active — ${elapsedStr}`)
  else if (status === 'PAUSED') tooltipParts.push(`Paused — ${elapsedStr}`)
  else tooltipParts.push('Idle')

  trayInstance.setToolTip(tooltipParts.join(' — '))
  trayInstance.setContextMenu(buildContextMenu(status))
}

export function destroyTray(): void {
  if (trayInstance) {
    trayInstance.destroy()
    trayInstance = null
  }
}
