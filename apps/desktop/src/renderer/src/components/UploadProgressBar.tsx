import React from 'react'

interface UploadProgressBarProps {
  pending: number
  uploaded: number
}

export function UploadProgressBar({ pending, uploaded }: UploadProgressBarProps): React.ReactElement | null {
  if (pending <= 0) return null

  const total = pending + uploaded
  const progressPercent = total > 0 ? Math.round((uploaded / total) * 100) : 0

  return (
    <div className="px-4 py-2 bg-nau-blue/10 border-t border-nau-blue/20">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-nau-blue font-medium">
          Uploading {pending} file{pending !== 1 ? 's' : ''}…
        </span>
        <span className="text-xs text-gray-500">{progressPercent}%</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-nau-blue rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  )
}
