import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { getAuthContext, requireRole } from '@/lib/middleware/rbac';
import { getWeeklyBudget, getBudgetStatus, getBudgetPercentage } from '@/lib/services/budget';
import { getWeekStart, getWeekEnd } from '@/lib/dates';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  const roleError = requireRole(ctx, 'INSTRUCTOR');
  if (roleError) return roleError;
  if (!ctx) return errors.unauthorized();

  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(weekStart);

  const instructorAssignments = await prisma.courseAssignment.findMany({
    where: { userId: ctx.userId, role: 'INSTRUCTOR' },
    select: { courseId: true },
  });

  const courseIds = instructorAssignments.map((a) => a.courseId);
  if (courseIds.length === 0) {
    return NextResponse.json({ courses: [] });
  }

  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds } },
    include: {
      assignments: {
        where: { role: 'TA' },
        include: {
          submissions: {
            where: { status: 'SUBMITTED' },
            select: { id: true },
          },
          sessions: {
            where: { startedAt: { gte: weekStart, lte: weekEnd } },
            select: { netHours: true },
          },
        },
      },
    },
    orderBy: [{ year: 'desc' }, { code: 'asc' }],
  });

  const courseData = courses.map((course) => {
    const weeklyBudget = getWeeklyBudget(course);
    const usedHours = course.assignments.reduce((sum, a) =>
      sum + a.sessions.reduce((s, session) => s + Number(session.netHours), 0), 0);
    const pendingSubmissions = course.assignments.reduce((sum, a) => sum + a.submissions.length, 0);

    return {
      courseId: course.id,
      code: course.code,
      name: course.name,
      semester: course.semester,
      year: course.year,
      enrolledStudents: course.enrolledStudents,
      pendingSubmissions,
      budget: {
        weeklyBudget,
        usedHours: Math.round(usedHours * 100) / 100,
        budgetPercentage: getBudgetPercentage(usedHours, weeklyBudget),
        budgetStatus: getBudgetStatus(usedHours, weeklyBudget),
      },
    };
  });

  return NextResponse.json({ courses: courseData });
}
