import React, { useRef, useState } from 'react'
import type { SessionState } from '../hooks/useSession'
import { formatElapsed } from '../utils/format'

interface ActiveViewProps {
  session: SessionState
  mode: string
  courseCode: string
  category: string
  onPause: () => Promise<void>
  onResume: () => Promise<void>
  onStop: (description: string) => Promise<void>
}

const IDLE_THRESHOLD_SECONDS = 240

export function ActiveView({
  session,
  mode,
  courseCode,
  category,
  onPause,
  onResume,
  onStop,
}: ActiveViewProps): React.ReactElement {
  const [showStopModal, setShowStopModal] = useState(false)
  const [description, setDescription] = useState('')
  const [stopping, setStopping] = useState(false)
  const [photoCount, setPhotoCount] = useState(0)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const isActive = session.status === 'ACTIVE'
  const isPaused = session.status === 'PAUSED'
  const showIdleWarning = session.idleSeconds >= IDLE_THRESHOLD_SECONDS
  const isInPerson = mode === 'IN_PERSON'

  const timerColor = isActive
    ? 'text-green-600'
    : 'text-amber-500'

  const categoryLabel = category
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')

  async function handleConfirmStop() {
    if (!description.trim()) return
    setStopping(true)
    try {
      await onStop(description.trim())
      setShowStopModal(false)
      setDescription('')
    } finally {
      setStopping(false)
    }
  }

  function handleCancelStop() {
    setShowStopModal(false)
    setDescription('')
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    const filePaths = Array.from(files).map((f) => (f as unknown as { path: string }).path)
    const result = await window.electronAPI.uploadPhotos(filePaths)
    setPhotoCount((prev) => prev + result.uploaded)

    // Reset input so same files can be re-selected if needed
    if (photoInputRef.current) {
      photoInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 flex-1">
      {/* Idle Warning Banner */}
      {showIdleWarning && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="text-amber-500 text-base">⚠️</span>
          <p className="text-xs text-amber-700 font-medium">
            Idle for {Math.floor(session.idleSeconds / 60)}m — pausing soon…
          </p>
        </div>
      )}

      {/* Timer Display */}
      <div className="flex flex-col items-center py-6">
        <span
          className={`font-mono text-5xl font-bold tracking-tight tabular-nums transition-colors ${timerColor}`}
        >
          {formatElapsed(session.elapsed)}
        </span>
        <span className="text-xs text-gray-400 mt-2 font-medium uppercase tracking-widest">
          {isActive ? 'Recording' : 'Paused'}
        </span>
      </div>

      {/* Session Info Row */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span className="px-2.5 py-1 bg-nau-blue/10 text-nau-blue text-xs font-semibold rounded-full">
          {courseCode}
        </span>
        <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
          {categoryLabel}
        </span>
        <span
          className={`px-2.5 py-1 text-xs font-medium rounded-full ${
            isInPerson
              ? 'bg-purple-50 text-purple-700'
              : 'bg-sky-50 text-sky-700'
          }`}
        >
          {isInPerson ? 'In Person' : 'Screen'}
        </span>
      </div>

      {/* Screenshot Counter (SCREEN mode only) */}
      {!isInPerson && (
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-base">📸</span>
          <span className="text-sm text-gray-500">
            {session.screenshotCount} screenshot{session.screenshotCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Photo Upload Section (IN_PERSON mode only) */}
      {isInPerson && (
        <div className="flex flex-col items-center gap-2">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <button
            onClick={() => photoInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span>📎</span>
            Upload Photos
          </button>
          {photoCount > 0 && (
            <span className="text-xs text-gray-500">
              {photoCount} photo{photoCount !== 1 ? 's' : ''} uploaded
            </span>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Control Buttons */}
      <div className="flex gap-3">
        {isActive && (
          <button
            onClick={onPause}
            className="flex-1 py-2.5 rounded-lg border-2 border-nau-blue text-nau-blue text-sm font-semibold hover:bg-nau-blue/5 transition-colors"
          >
            ⏸ Pause
          </button>
        )}
        {isPaused && (
          <button
            onClick={onResume}
            className="flex-1 py-2.5 rounded-lg border-2 border-green-600 text-green-600 text-sm font-semibold hover:bg-green-50 transition-colors"
          >
            ▶ Resume
          </button>
        )}
        <button
          onClick={() => setShowStopModal(true)}
          className="flex-1 py-2.5 rounded-lg border-2 border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
        >
          ⏹ Stop
        </button>
      </div>

      {/* Stop Confirmation Modal */}
      {showStopModal && (
        <div className="absolute inset-0 bg-black/40 flex items-end z-50">
          <div className="w-full bg-white rounded-t-2xl p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Stop Session</h3>
            <p className="text-xs text-gray-500 mb-3">
              Add a brief description of what you worked on.
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Graded lab 3 submissions, answered student questions…"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-nau-blue/40 focus:border-nau-blue text-gray-800 placeholder-gray-400"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCancelStop}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStop}
                disabled={!description.trim() || stopping}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  description.trim() && !stopping
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {stopping ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Stopping…
                  </>
                ) : (
                  'Confirm Stop'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
