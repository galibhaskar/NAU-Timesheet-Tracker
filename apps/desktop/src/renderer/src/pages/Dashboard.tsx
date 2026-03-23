import React, { useState } from 'react'
import type { AuthUserPublic, AssignmentListItem } from '../env.d'
import { ActiveView } from '../components/ActiveView'
import { IdleView } from '../components/IdleView'
import { UploadProgressBar } from '../components/UploadProgressBar'
import { useAssignments } from '../hooks/useAssignments'
import { useSession } from '../hooks/useSession'
import { formatHours } from '../utils/format'

interface DashboardProps {
  user: AuthUserPublic
  onLogout: () => void
}

export function Dashboard({ user, onLogout }: DashboardProps): React.ReactElement {
  const { assignments, loading: assignmentsLoading } = useAssignments()
  const { session, startSession, pauseSession, resumeSession, stopSession } = useSession()

  // Track what was selected at session start so ActiveView has context
  const [activeAssignmentId, setActiveAssignmentId] = useState<string>('')
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [activeMode, setActiveMode] = useState<string>('SCREEN')

  const activeAssignment = assignments.find((a: AssignmentListItem) => a.id === activeAssignmentId) ?? null

  // Compute total hours across all courses for header display
  const totalHoursThisWeek = assignments.reduce(
    (sum: number, a: AssignmentListItem) => sum + a.thisWeek.totalHours,
    0
  )

  async function handleStart(data: { assignmentId: string; category: string; mode: string }) {
    setActiveAssignmentId(data.assignmentId)
    setActiveCategory(data.category)
    setActiveMode(data.mode)
    await startSession(data)
  }

  async function handleStop(description: string) {
    await stopSession(description)
    setActiveAssignmentId('')
    setActiveCategory('')
    setActiveMode('SCREEN')
  }

  async function handleLogout() {
    await window.electronAPI.logout()
    onLogout()
  }

  const isSessionActive = session.status !== 'IDLE'

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden relative">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-nau-blue text-white shadow-md shrink-0">
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight">{user.name}</span>
          <span className="text-xs text-white/70 leading-tight">
            {formatHours(totalHoursThisWeek)} this week
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isSessionActive && (
            <button
              onClick={handleLogout}
              className="text-white/60 hover:text-white/90 text-xs transition-colors px-1"
              title="Sign out"
            >
              Sign out
            </button>
          )}
          <button
            onClick={() => window.electronAPI.minimizeWindow()}
            className="w-7 h-7 flex items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors text-lg leading-none"
            title="Minimize"
          >
            –
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden relative">
        {isSessionActive ? (
          <ActiveView
            session={session}
            mode={activeMode}
            courseCode={activeAssignment?.course.code ?? ''}
            category={activeCategory}
            onPause={pauseSession}
            onResume={resumeSession}
            onStop={handleStop}
          />
        ) : (
          <IdleView
            assignments={assignments}
            assignmentsLoading={assignmentsLoading}
            onStart={handleStart}
          />
        )}
      </div>

      {/* Upload Progress Bar */}
      <UploadProgressBar pending={session.uploadPending} uploaded={0} />
    </div>
  )
}
