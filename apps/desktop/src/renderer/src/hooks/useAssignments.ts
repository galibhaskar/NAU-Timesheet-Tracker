import { useEffect, useState } from 'react'
import type { AssignmentListItem } from '../env.d'

interface UseAssignmentsReturn {
  assignments: AssignmentListItem[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAssignments(): UseAssignmentsReturn {
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    window.electronAPI
      .listAssignments()
      .then((data) => {
        if (!cancelled) {
          setAssignments(data)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load assignments'
          setError(message)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [tick])

  const refetch = () => setTick((n) => n + 1)

  return { assignments, loading, error, refetch }
}
