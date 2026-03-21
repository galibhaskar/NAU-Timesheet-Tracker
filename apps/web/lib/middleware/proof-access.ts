import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { NextResponse } from 'next/server';
import type { AuthContext } from './rbac';

/**
 * Verify access to proof files for a session.
 * ADMIN: always allowed
 * INSTRUCTOR: must have CourseAssignment with role INSTRUCTOR for the session's course
 * TA: always forbidden (403)
 */
export async function requireProofAccess(
  ctx: AuthContext,
  sessionId: string
): Promise<NextResponse | null> {
  if (ctx.role === 'ADMIN') return null;
  if (ctx.role === 'TA') return errors.forbidden('TAs cannot view proof files');

  // Walk the chain: WorkSession → CourseAssignment → Course
  const session = await prisma.workSession.findUnique({
    where: { id: sessionId },
    include: {
      assignment: {
        include: { course: true },
      },
    },
  });

  if (!session) return errors.notFound('Session not found');

  // Verify instructor is assigned to this course
  const instructorAssignment = await prisma.courseAssignment.findFirst({
    where: {
      userId: ctx.userId,
      courseId: session.assignment.courseId,
      role: 'INSTRUCTOR',
    },
  });

  if (!instructorAssignment) {
    return errors.forbidden('Not an instructor for this course');
  }

  return null;
}
