import { prisma } from '@/lib/prisma';
import { getWeekStart, getWeekEnd } from '@/lib/dates';
import type { SubmissionStatus } from '@prisma/client';

export const MAX_REJECTION_CYCLES = 3;

/** Valid submission status transitions */
const VALID_TRANSITIONS: Partial<Record<SubmissionStatus, SubmissionStatus[]>> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['APPROVED', 'REJECTED'],
  REJECTED: ['SUBMITTED'],
  APPROVED: [],
};

export function canTransition(from: SubmissionStatus, to: SubmissionStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Count how many times a submission has been rejected.
 * Reads from audit log to avoid overwriting rejection_reason field.
 */
export async function getRejectionCount(submissionId: string): Promise<number> {
  return prisma.auditLog.count({
    where: {
      entityType: 'WeeklySubmission',
      entityId: submissionId,
      action: 'REJECTED',
    },
  });
}

/** Get or create a WeeklySubmission for a given assignment + week */
export async function getOrCreateSubmission(assignmentId: string, weekOf: Date) {
  const weekStart = getWeekStart(weekOf);
  const weekEnd = getWeekEnd(weekStart);

  const existing = await prisma.weeklySubmission.findUnique({
    where: { assignmentId_weekStart: { assignmentId, weekStart } },
  });

  if (existing) return existing;

  return prisma.weeklySubmission.create({
    data: {
      assignmentId,
      weekStart,
      weekEnd,
      status: 'DRAFT',
    },
  });
}
