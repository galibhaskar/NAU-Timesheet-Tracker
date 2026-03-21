import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { getAuthContext, requireRole } from '@/lib/middleware/rbac';
import { parseBody, SubmitWeekSchema } from '@/lib/validators';
import { createAuditLog, getClientIp } from '@/lib/audit';
import { getWeekStart, getWeekEnd } from '@/lib/dates';
import { getRejectionCount, MAX_REJECTION_CYCLES } from '@/lib/services/submission-service';

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  const roleError = requireRole(ctx, 'TA');
  if (roleError) return roleError;
  if (!ctx) return errors.unauthorized();

  const body = await req.json().catch(() => null);
  const { data, error } = parseBody(SubmitWeekSchema, body);
  if (error) return error;

  // Verify TA owns the assignment
  const assignment = await prisma.courseAssignment.findUnique({
    where: { id: data.assignmentId },
  });
  if (!assignment) return errors.notFound('Assignment not found');
  if (assignment.userId !== ctx.userId) return errors.forbidden();
  if (assignment.role !== 'TA') return errors.forbidden('Only TAs can submit');

  const weekStart = getWeekStart(new Date(data.weekStart));
  const weekEnd = getWeekEnd(weekStart);

  // Check for in-progress sessions this week
  const inProgressSessions = await prisma.workSession.findMany({
    where: {
      assignmentId: data.assignmentId,
      status: { in: ['ACTIVE', 'PAUSED'] },
      startedAt: { gte: weekStart, lte: weekEnd },
    },
    select: { id: true, status: true },
  });

  if (inProgressSessions.length > 0) {
    return errors.unprocessable(
      'Cannot submit while sessions are still in progress',
      { inProgressSessionIds: inProgressSessions.map((s) => s.id) }
    );
  }

  // Get completed sessions for this week
  const completedSessions = await prisma.workSession.findMany({
    where: {
      assignmentId: data.assignmentId,
      status: 'COMPLETED',
      submissionId: null, // not yet submitted
      startedAt: { gte: weekStart, lte: weekEnd },
    },
    include: {
      _count: { select: { screenshots: true } },
    },
  });

  // Check existing submission
  const existingSubmission = await prisma.weeklySubmission.findUnique({
    where: { assignmentId_weekStart: { assignmentId: data.assignmentId, weekStart } },
  });

  if (existingSubmission) {
    if (existingSubmission.status === 'APPROVED') {
      return errors.conflict('This week is already approved');
    }
    if (existingSubmission.status === 'SUBMITTED') {
      return errors.conflict('Already submitted for review');
    }
    if (existingSubmission.status === 'REJECTED') {
      const rejections = await getRejectionCount(existingSubmission.id);
      if (rejections >= MAX_REJECTION_CYCLES) {
        return errors.unprocessable(
          `Maximum ${MAX_REJECTION_CYCLES} resubmissions reached. Admin intervention required.`
        );
      }
    }
  }

  const totalHours = completedSessions.reduce((sum, s) => sum + Number(s.netHours), 0);
  const totalScreenshots = completedSessions.reduce((sum, s) => sum + s._count.screenshots, 0);

  const submission = await prisma.$transaction(async (tx) => {
    let sub;
    if (existingSubmission) {
      sub = await tx.weeklySubmission.update({
        where: { id: existingSubmission.id },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          totalHours,
          totalScreenshots,
          reviewerId: null,
          reviewedAt: null,
        },
      });
    } else {
      sub = await tx.weeklySubmission.create({
        data: {
          assignmentId: data.assignmentId,
          weekStart,
          weekEnd,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          totalHours,
          totalScreenshots,
        },
      });
    }

    // Link sessions to submission
    await tx.workSession.updateMany({
      where: { id: { in: completedSessions.map((s) => s.id) } },
      data: { submissionId: sub.id },
    });

    return sub;
  });

  await createAuditLog({
    userId: ctx.userId,
    action: 'SUBMISSION_SUBMIT',
    entityType: 'WeeklySubmission',
    entityId: submission.id,
    details: { totalHours, sessionCount: completedSessions.length, weekStart: weekStart.toISOString() },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ submission }, { status: 201 });
}
