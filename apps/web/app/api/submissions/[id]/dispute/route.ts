import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { getAuthContext, requireRole } from '@/lib/middleware/rbac';
import { parseBody, DisputeHoldSchema } from '@/lib/validators';
import { createAuditLog, getClientIp } from '@/lib/audit';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(req);
  const roleError = requireRole(ctx, 'INSTRUCTOR', 'ADMIN');
  if (roleError) return roleError;
  if (!ctx) return errors.unauthorized();

  const body = await req.json().catch(() => null);
  const { data, error } = parseBody(DisputeHoldSchema, body);
  if (error) return error;

  // Load submission with assignment for course access check
  const submission = await prisma.weeklySubmission.findUnique({
    where: { id: params.id },
    include: { assignment: true },
  });
  if (!submission) return errors.notFound('Submission not found');

  // INSTRUCTORs must be assigned to this course; ADMINs bypass
  if (ctx.role === 'INSTRUCTOR') {
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
  }

  const updated = await prisma.weeklySubmission.update({
    where: { id: params.id },
    data: { disputeHold: data.disputeHold },
  });

  await createAuditLog({
    userId: ctx.userId,
    action: 'SUBMISSION_DISPUTE',
    entityType: 'WeeklySubmission',
    entityId: params.id,
    details: {
      disputeHold: data.disputeHold,
      weekStart: submission.weekStart.toISOString(),
      courseId: submission.assignment.courseId,
    },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ submission: updated }, { status: 200 });
}
