import { desktopCapturer, BrowserWindow } from 'electron'
import axios from 'axios'
import {
  SCREENSHOT_INTERVAL_MIN_MS,
  SCREENSHOT_INTERVAL_MAX_MS,
  API_BASE_URL,
} from './constants'
import { getAccessToken } from './auth'
import { enqueue } from './upload-queue'

let screenshotTimer: ReturnType<typeof setTimeout> | null = null
let screenshotCount = 0

function randomIntervalMs(): number {
  return (
    SCREENSHOT_INTERVAL_MIN_MS +
    Math.floor(Math.random() * (SCREENSHOT_INTERVAL_MAX_MS - SCREENSHOT_INTERVAL_MIN_MS))
  )
}

async function captureAndUpload(sessionId: string, mainWindow: BrowserWindow): Promise<void> {
  try {
    // Capture all screens; pick the primary (first) source
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    })

    if (sources.length === 0) {
      console.warn('[screenshot] No screen sources found')
      return
    }

    const source = sources[0]
    if (!source) {
      console.warn('[screenshot] Primary source unavailable')
      return
    }

    // Convert to JPEG buffer (quality 80) — never touch the filesystem
    const jpegBuffer: Buffer = source.thumbnail.toJPEG(80)
    const capturedAt = new Date().toISOString()
    const fileSize = jpegBuffer.length

    const accessToken = await getAccessToken()
    if (!accessToken) {
      console.warn('[screenshot] No access token; enqueuing for retry')
      enqueue({
        type: 'screenshot',
        sessionId,
        data: jpegBuffer,
        metadata: { capturedAt, fileSize },
      })
      return
    }

    // Request presigned upload URL from server
    const { data: presignResponse } = await axios.post<{ uploadUrl: string }>(
      `${API_BASE_URL}/api/sessions/${sessionId}/screenshots`,
      { capturedAt, fileSize },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    const uploadUrl = presignResponse.uploadUrl

    // PUT the JPEG buffer directly to S3 — no disk I/O
    await axios.put(uploadUrl, jpegBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': fileSize,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    })

    screenshotCount++

    // Notify renderer
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('session:screenshot-taken', {
        sessionId,
        count: screenshotCount,
      })
    }
  } catch (err) {
    console.error('[screenshot] Capture/upload error:', err)
    // Will be retried on next interval — no persistent queue for in-flight screenshots
    // to avoid memory pressure on long sessions
  }
}

function scheduleNext(sessionId: string, mainWindow: BrowserWindow): void {
  const delay = randomIntervalMs()
  screenshotTimer = setTimeout(async () => {
    await captureAndUpload(sessionId, mainWindow)
    // Only reschedule if timer wasn't cleared (session still active)
    if (screenshotTimer !== null) {
      scheduleNext(sessionId, mainWindow)
    }
  }, delay)
}

export function startScreenshotTimer(sessionId: string, mainWindow: BrowserWindow): void {
  stopScreenshotTimer()
  screenshotCount = 0
  scheduleNext(sessionId, mainWindow)
}

export function stopScreenshotTimer(): void {
  if (screenshotTimer !== null) {
    clearTimeout(screenshotTimer)
    screenshotTimer = null
  }
}
