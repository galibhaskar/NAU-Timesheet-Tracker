import { app, BrowserWindow, shell } from 'electron'
import path from 'path'
import { createTray, destroyTray } from './tray'
import { registerIpcHandlers } from './ipc-handlers'
import { initAuthStore } from './auth'
import { startWorker } from './upload-queue'

// Disable hardware acceleration to avoid GPU crashes on some systems
app.disableHardwareAcceleration()

// Security: prevent privilege escalation via renderer navigation
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    // Only allow local renderer pages
    if (parsedUrl.protocol !== 'file:' && !parsedUrl.hostname.includes('localhost')) {
      event.preventDefault()
    }
  })

  // Open external links in the system browser, not in the app
  contents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
})

let mainWindow: BrowserWindow | null = null
let isQuitting = false

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 420,
    height: 680,
    resizable: false,
    show: false, // show after ready-to-show for a smoother launch
    title: 'NAU Timesheet',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // sandbox: true breaks native modules (e.g., electron-store)
      preload: path.join(__dirname, '../preload/index.js'),
    },
  })

  // Load the renderer
  if (process.env['ELECTRON_RENDERER_URL']) {
    // Dev mode: electron-vite dev server
    void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  win.once('ready-to-show', () => {
    win.show()
  })

  // Minimize to tray on close if a session is active; quit normally otherwise
  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      win.hide()
    }
  })

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[main] Renderer failed to load: ${errorCode} ${errorDescription}`)
  })

  return win
}

app.whenReady().then(() => {
  initAuthStore()

  mainWindow = createWindow()

  // System tray
  createTray(mainWindow)

  // Register all IPC handlers
  registerIpcHandlers(mainWindow)

  // Start upload queue background worker
  startWorker(mainWindow)

  // macOS: re-create window if dock icon is clicked after all windows closed
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
      registerIpcHandlers(mainWindow)
    } else if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
})

app.on('before-quit', () => {
  isQuitting = true
  destroyTray()
})

// Quit when all windows are closed on Windows/Linux
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
