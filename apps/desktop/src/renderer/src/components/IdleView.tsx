import React, { useRef, useState } from 'react'
import type { AssignmentListItem } from '../env.d'
import { formatHours } from '../utils/format'

interface Category {
  value: string
  label: string
  icon: string
}

const CATEGORIES: Category[] = [
  { value: 'GRADING', label: 'Grading', icon: '📋' },
  { value: 'OFFICE_HOURS', label: 'Office Hours', icon: '🏢' },
  { value: 'LAB_PREP', label: 'Lab Prep', icon: '🧪' },
  { value: 'TUTORING', label: 'Tutoring', icon: '💬' },
  { value: 'MEETINGS', label: 'Meetings', icon: '📅' },
  { value: 'OTHER', label: 'Other', icon: '⋯' },
]

interface IdleViewProps {
  assignments: AssignmentListItem[]
  assignmentsLoading: boolean
  onStart: (data: { assignmentId: string; category: string; mode: string }) => Promise<void>
}

export function IdleView({ assignments, assignmentsLoading, onStart }: IdleViewProps): React.ReactElement {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [mode, setMode] = useState<'SCREEN' | 'IN_PERSON'>('SCREEN')
  const [starting, setStarting] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId) ?? null

  const usedHours = selectedAssignment?.thisWeek.totalHours ?? 0
  const maxHours = selectedAssignment?.maxWeeklyHours ?? 0
  const budgetPercent = maxHours > 0 ? Math.min((usedHours / maxHours) * 100, 100) : 0

  const budgetBarColor =
    budgetPercent >= 90
      ? 'bg-red-500'
      : budgetPercent >= 70
        ? 'bg-yellow-400'
        : 'bg-green-500'

  const canStart = selectedAssignmentId !== '' && selectedCategory !== '' && !starting

  async function handleStart() {
    if (!canStart) return
    setStarting(true)
    try {
      await onStart({
        assignmentId: selectedAssignmentId,
        category: selectedCategory,
        mode,
      })
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 flex-1">
      {/* Course Selector */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Course
        </label>
        {assignmentsLoading ? (
          <div className="h-9 bg-gray-100 rounded-lg animate-pulse" />
        ) : (
          <select
            value={selectedAssignmentId}
            onChange={(e) => setSelectedAssignmentId(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-nau-blue/40 focus:border-nau-blue"
          >
            <option value="">Select a course…</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.course.code} — {a.course.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Weekly Budget Bar */}
      {selectedAssignment && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              This Week
            </span>
            <span className="text-xs text-gray-600">
              {formatHours(usedHours)} / {formatHours(maxHours)}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${budgetBarColor}`}
              style={{ width: `${budgetPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Category Grid */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Category
        </label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`flex flex-col items-center justify-center gap-1 py-3 rounded-lg border text-xs font-medium transition-all ${
                selectedCategory === cat.value
                  ? 'bg-nau-blue text-white border-nau-blue shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-nau-blue/40 hover:bg-nau-blue/5'
              }`}
            >
              <span className="text-base leading-none">{cat.icon}</span>
              <span className="leading-none">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mode Toggle */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Mode
        </label>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setMode('SCREEN')}
            className={`flex-1 py-2 text-sm font-medium transition-all ${
              mode === 'SCREEN'
                ? 'bg-nau-blue text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Screen
          </button>
          <button
            onClick={() => setMode('IN_PERSON')}
            className={`flex-1 py-2 text-sm font-medium transition-all border-l border-gray-200 ${
              mode === 'IN_PERSON'
                ? 'bg-nau-blue text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            In Person
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-center">
          {mode === 'SCREEN'
            ? 'Screenshots auto-captured every ~5 min'
            : 'You can upload photos after starting'}
        </p>
      </div>

      {/* Hidden photo input (used in active view, declared here to share ref) */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
      />

      {/* Start Button */}
      <button
        onClick={handleStart}
        disabled={!canStart}
        className={`mt-auto w-full py-3 rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2 ${
          canStart
            ? 'bg-nau-blue text-white shadow-md hover:bg-nau-blue/90 active:scale-[0.98]'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {starting ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Starting…
          </>
        ) : (
          'Start Session'
        )}
      </button>
    </div>
  )
}
