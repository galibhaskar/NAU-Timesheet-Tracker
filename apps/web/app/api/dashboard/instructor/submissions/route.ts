import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { getAuthContext, requireRole } from '@/lib/middleware/rbac';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  const roleError = requireRole(ctx, 'INSTRUCTOR');
  if (roleError) return roleError;
  if (!ctx) return errors.unauthorized();

  const instructorAssignments = await prisma.courseAssignment.findMany({
    where: { userId: ctx.userId, role: 'INSTRUCTOR' },
    select: { courseId: true },
  });

  const courseIds = instructorAssignments.map((a) => a.courseId);
  if (courseIds.length === 0) {
    return NextResponse.json({ pendingSubmissions: [] });
  }

  const submissions = await prisma.weeklySubmission.findMany({
    where: {
      status: 'SUBMITTED',
      assignment: { courseId: { in: courseIds }, role: 'TA' },
    },
    include: {
      assignment: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, name: true, code: true } },
        },
      },
    },
    orderBy: { submittedAt: 'asc' },
  });

  const pendingSubmissions = submissions.map((s) => ({
    id: s.id,
    taName: s.assignment.user.name,
    taEmail: s.assignment.user.email,
    taId: s.assignment.user.id,
    courseId: s.assignment.course.id,
    courseCode: s.assignment.course.code,
    courseName: s.assignment.course.name,
    weekStart: s.weekStart.toISOString(),
    weekEnd: s.weekEnd.toISOString(),
    totalHours: Number(s.totalHours),
    totalScreenshots: s.totalScreenshots,
    status: s.status,
    submittedAt: s.submittedAt?.toISOString() ?? null,
  }));

  return NextResponse.json({ pendingSubmissions });
}
