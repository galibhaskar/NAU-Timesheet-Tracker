'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TAWeekActionsProps {
  assignmentId: string;
  weekStart: string;
  sessionCount: number;
  hasActiveSessions: boolean;
}

export function TAWeekActions({
  assignmentId,
  weekStart,
  sessionCount,
  hasActiveSessions,
}: TAWeekActionsProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmitWeek() {
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/submissions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, weekStart }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'Failed to submit. Please try again.');
      } else {
        router.refresh();
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {error && <p className="text-xs text-red-600">{error}</p>}
      {sessionCount === 0 ? (
        <p className="text-xs text-gray-400">No completed sessions this week</p>
      ) : hasActiveSessions ? (
        <p className="text-xs text-yellow-600">Stop active sessions before submitting</p>
      ) : (
        <button
          onClick={handleSubmitWeek}
          disabled={submitting}
          className="rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Week'}
        </button>
      )}
    </div>
  );
}
