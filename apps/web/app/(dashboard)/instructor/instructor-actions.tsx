'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface InstructorActionsProps {
  submissionId: string;
}

export function InstructorActions({ submissionId }: InstructorActionsProps) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionDone, setActionDone] = useState(false);

  async function handleApprove() {
    setError(null);
    setApproving(true);

    try {
      const res = await fetch(`/api/submissions/${submissionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'Failed to approve. Please try again.');
      } else {
        setActionDone(true);
        router.refresh();
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      setError('A rejection reason is required.');
      return;
    }

    setError(null);
    setRejecting(true);

    try {
      const res = await fetch(`/api/submissions/${submissionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'Failed to reject. Please try again.');
      } else {
        setShowRejectModal(false);
        setActionDone(true);
        router.refresh();
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setRejecting(false);
    }
  }

  if (actionDone) {
    return <span className="text-sm text-green-600 font-medium">Done</span>;
  }

  return (
    <>
      <div className="flex flex-col items-end gap-2">
        {error && <p className="text-xs text-red-600 text-right max-w-[200px]">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={approving}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {approving ? 'Approving…' : 'Approve'}
          </button>
          <button
            onClick={() => {
              setError(null);
              setRejectReason('');
              setShowRejectModal(true);
            }}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            Reject
          </button>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Reject Submission</h3>
            <p className="mt-1 text-sm text-gray-500">
              Provide a clear reason so the TA knows what to fix.
            </p>

            {error && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-4">
              <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-700">
                Rejection reason <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reject-reason"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Missing descriptions for office hours sessions on Tuesday."
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-nau-navy focus:outline-none focus:ring-2 focus:ring-nau-navy/20 resize-none"
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setError(null);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting || !rejectReason.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {rejecting ? 'Rejecting…' : 'Reject Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
