import { BrowserWindow } from 'electron'
import Store from 'electron-store'
import axios from 'axios'
import { randomUUID } from 'crypto'
import {
  UPLOAD_RETRY_INTERVAL_MS,
  UPLOAD_MAX_RETRIES,
  API_BASE_URL,
} from './constants'
import { getAccessToken } from './auth'

export interface QueueItem {
  id: string
  type: 'screenshot' | 'photo'
  sessionId: string
  /**
   * Buffer is stored in memory only during an active session.
   * Items without data are dropped on app restart (data will be null after
   * deserialization since Buffer cannot round-trip through electron-store).
   */
  data: Buffer | null
  metadata: Record<string, unknown>
  retries: number
  nextRetryAt: number
}

interface SerializedQueueItem extends Omit<QueueItem, 'data'> {
  data: null // Buffers are not persisted
}

/**
 * We only persist the metadata/retry state.
 * The actual binary data lives in the in-memory map below.
 */
const store = new Store<{ uploadQueue: SerializedQueueItem[] }>({
  name: 'nau-upload-queue',
  defaults: { uploadQueue: [] },
})

// In-memory map of id → Buffer so we can survive multiple retries within a session
const bufferMap = new Map<string, Buffer>()

let workerTimer: ReturnType<typeof setInterval> | null = null
let mainWindowRef: BrowserWindow | null = null

// ─── Public API ──────────────────────────────────────────────────────────────

export function enqueue(item: Omit<QueueItem, 'id' | 'retries' | 'nextRetryAt'>): void {
  const id = randomUUID()
  const now = Date.now()

  if (item.data) {
    bufferMap.set(id, item.data)
  }

  const serialized: SerializedQueueItem = {
    id,
    type: item.type,
    sessionId: item.sessionId,
    data: null,
    metadata: item.metadata,
    retries: 0,
    nextRetryAt: now, // eligible immediately
  }

  const queue = store.get('uploadQueue')
  store.set('uploadQueue', [...queue, serialized])

  emitProgress()
}

export function startWorker(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow
  stopWorker()
  workerTimer = setInterval(() => {
    void processQueue()
  }, UPLOAD_RETRY_INTERVAL_MS)
}

export function stopWorker(): void {
  if (workerTimer !== null) {
    clearInterval(workerTimer)
    workerTimer = null
  }
}

export function clearSession(sessionId: string): void {
  const queue = store.get('uploadQueue')
  const remaining = queue.filter((item) => item.sessionId !== sessionId)
  store.set('uploadQueue', remaining)

  // Also clean up in-memory buffers
  for (const [id, _] of bufferMap.entries()) {
    const item = queue.find((q) => q.id === id)
    if (item && item.sessionId === sessionId) {
      bufferMap.delete(id)
    }
  }
}

// ─── Worker Logic ─────────────────────────────────────────────────────────────

async function processQueue(): Promise<void> {
  const queue = store.get('uploadQueue')
  const now = Date.now()

  // Pick items that are due for retry and have data available
  const eligible = queue.filter(
    (item) => item.nextRetryAt <= now && item.retries < UPLOAD_MAX_RETRIES && bufferMap.has(item.id)
  )

  if (eligible.length === 0) return

  const accessToken = await getAccessToken()
  if (!accessToken) return

  for (const item of eligible) {
    const data = bufferMap.get(item.id)
    if (!data) continue

    const success = await attemptUpload(item, data, accessToken)

    if (success) {
      // Remove from queue and buffer map
      const updated = store.get('uploadQueue').filter((q) => q.id !== item.id)
      store.set('uploadQueue', updated)
      bufferMap.delete(item.id)
    } else {
      // Exponential backoff: 30s, 60s, 120s, 240s, 480s
      const backoffMs = UPLOAD_RETRY_INTERVAL_MS * Math.pow(2, item.retries)
      const updated = store.get('uploadQueue').map((q) =>
        q.id === item.id ? { ...q, retries: q.retries + 1, nextRetryAt: now + backoffMs } : q
      )
      store.set('uploadQueue', updated)
    }
  }

  // Drop items that exceeded max retries
  const finalQueue = store
    .get('uploadQueue')
    .filter((item) => {
      if (item.retries >= UPLOAD_MAX_RETRIES) {
        bufferMap.delete(item.id)
        console.warn(`[upload-queue] Dropping item ${item.id} after ${UPLOAD_MAX_RETRIES} retries`)
        return false
      }
      return true
    })
  store.set('uploadQueue', finalQueue)

  emitProgress()
}

async function attemptUpload(
  item: SerializedQueueItem,
  data: Buffer,
  accessToken: string
): Promise<boolean> {
  try {
    if (item.type === 'screenshot') {
      return await uploadScreenshot(item, data, accessToken)
    } else {
      return await uploadPhoto(item, data, accessToken)
    }
  } catch (err) {
    console.error(`[upload-queue] Upload attempt failed for ${item.id}:`, err)
    return false
  }
}

async function uploadScreenshot(
  item: SerializedQueueItem,
  data: Buffer,
  accessToken: string
): Promise<boolean> {
  const { capturedAt, fileSize } = item.metadata as { capturedAt: string; fileSize: number }

  const { data: presignResponse } = await axios.post<{ uploadUrl: string }>(
    `${API_BASE_URL}/api/sessions/${item.sessionId}/screenshots`,
    { capturedAt, fileSize },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  await axios.put(presignResponse.uploadUrl, data, {
    headers: { 'Content-Type': 'image/jpeg', 'Content-Length': data.length },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  })

  return true
}

async function uploadPhoto(
  item: SerializedQueueItem,
  data: Buffer,
  accessToken: string
): Promise<boolean> {
  const { caption, uploadedAt, mimeType } = item.metadata as {
    caption?: string
    uploadedAt: string
    mimeType: string
  }

  const { data: presignResponse } = await axios.post<{ uploadUrl: string }>(
    `${API_BASE_URL}/api/sessions/${item.sessionId}/photos`,
    { caption, uploadedAt },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  await axios.put(presignResponse.uploadUrl, data, {
    headers: { 'Content-Type': mimeType, 'Content-Length': data.length },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  })

  return true
}

function emitProgress(): void {
  if (!mainWindowRef || mainWindowRef.isDestroyed()) return

  const queue = store.get('uploadQueue')
  const pending = queue.filter((item) => item.retries < UPLOAD_MAX_RETRIES).length
  const uploaded = queue.filter((item) => item.retries === 0).length // crude approximation

  mainWindowRef.webContents.send('upload:progress', { pending, uploaded })
}
