import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { getAuthContext, requireRole } from '@/lib/middleware/rbac';
import { parseBody, RejectSubmissionSchema } from '@/lib/validators';
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

  const body = await req.json().catch(() => null);
  const { data, error } = parseBody(RejectSubmissionSchema, body);
  if (error) return error;

  // Load submission with assignment
  const submission = await prisma.weeklySubmission.findUnique({
    where: { id: params.id },
    include: {
      assignment: true,
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

  // Validate status transition SUBMITTED → REJECTED
  if (!canTransition(submission.status, 'REJECTED')) {
    return errors.conflict(
      `Cannot reject a submission with status ${submission.status}`
    );
  }

  const now = new Date();
  const updated = await prisma.weeklySubmission.update({
    where: { id: params.id },
    data: {
      status: 'REJECTED',
      reviewerId: ctx.userId,
      reviewedAt: now,
      rejectionReason: data.reason,
    },
  });

  // Preserve rejection reason in audit log before it gets overwritten on resubmit
  await createAuditLog({
    userId: ctx.userId,
    action: 'REJECTED',
    entityType: 'WeeklySubmission',
    entityId: params.id,
    details: {
      reason: data.reason,
      totalHours: Number(submission.totalHours),
      weekStart: submission.weekStart.toISOString(),
      courseId: submission.assignment.courseId,
    },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ submission: updated }, { status: 200 });
}
