import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { getAuthContext, requireRole } from '@/lib/middleware/rbac';
import { createAuditLog, getClientIp } from '@/lib/audit';
import { canTransition } from '@/lib/services/submission-service';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(req);
  const roleError = requireRole(ctx, 'INSTRUCTOR');
  if (roleError) return roleError;
  if (!ctx) return errors.unauthorized();

  // Load submission with assignment + course
  const submission = await prisma.weeklySubmission.findUnique({
    where: { id: params.id },
    include: {
      assignment: {
        include: {
          course: true,
        },
      },
    },
  });
  if (!submission) return errors.notFound('Submission not found');

  // Verify instructor is assigned to this course
  const instructorAssignment = await prisma.courseAssignment.findFirst({
    where: {
      userId: ctx.userId,
      courseId: submission.assignment.courseId,
      role: 'INSTRUCTOR',
    },
  });
  if (!instructorAssignment) {
    return errors.forbidden('Not assigned as instructor for this course');
  }

  // Validate status transition SUBMITTED → APPROVED
  if (!canTransition(submission.status, 'APPROVED')) {
    return errors.conflict(
      `Cannot approve a submission with status ${submission.status}`
    );
  }

  // Budget warning: sum all approved hours for this assignment and compare to budget
  const approvedHoursResult = await prisma.weeklySubmission.aggregate({
    where: {
      assignmentId: submission.assignmentId,
      status: 'APPROVED',
    },
    _sum: { totalHours: true },
  });
  const alreadyApprovedHours = Number(approvedHoursResult._sum.totalHours ?? 0);
  const projectedTotal = alreadyApprovedHours + Number(submission.totalHours);
  const totalBudget = Number(submission.assignment.totalBudget);
  const hourlyRate = Number(submission.assignment.hourlyRate);
  const budgetHours = hourlyRate > 0 ? totalBudget / hourlyRate : null;

  let budgetWarning: string | null = null;
  if (budgetHours !== null && projectedTotal > budgetHours) {
    budgetWarning = `Approving this submission would bring total approved hours to ${projectedTotal.toFixed(2)}, exceeding the budget of ${budgetHours.toFixed(2)} hours.`;
  }

  const now = new Date();
  const updated = await prisma.weeklySubmission.update({
    where: { id: params.id },
    data: {
      status: 'APPROVED',
      reviewerId: ctx.userId,
      reviewedAt: now,
    },
  });

  await createAuditLog({
    userId: ctx.userId,
    action: 'SUBMISSION_APPROVE',
    entityType: 'WeeklySubmission',
    entityId: params.id,
    details: {
      totalHours: Number(submission.totalHours),
      weekStart: submission.weekStart.toISOString(),
      courseId: submission.assignment.courseId,
      ...(budgetWarning ? { budgetWarning } : {}),
    },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json(
    {
      submission: updated,
      ...(budgetWarning ? { warning: budgetWarning } : {}),
    },
    { status: 200 }
  );
}
