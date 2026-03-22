import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { getAuthContext, requireRole } from '@/lib/middleware/rbac';
import { getWeeklyBudget, getBudgetStatus, getBudgetPercentage } from '@/lib/services/budget';
import { getWeekStart, getWeekEnd } from '@/lib/dates';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  const roleError = requireRole(ctx, 'ADMIN');
  if (roleError) return roleError;
  if (!ctx) return errors.unauthorized();

  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(weekStart);

  const courses = await prisma.course.findMany({
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

  let totalPendingSubmissions = 0;
  const overspendAlerts: Array<{
    courseId: string;
    courseCode: string;
    courseName: string;
    usedHours: number;
    weeklyBudget: number;
    overspendHours: number;
    budgetPercentage: number;
  }> = [];

  const courseOverviews = courses.map((course) => {
    const weeklyBudget = getWeeklyBudget(course);
    const usedHours = course.assignments.reduce((sum, a) =>
      sum + a.sessions.reduce((s, session) => s + Number(session.netHours), 0), 0);
    const pendingCount = course.assignments.reduce((sum, a) => sum + a.submissions.length, 0);
    totalPendingSubmissions += pendingCount;

    const budgetStatus = getBudgetStatus(usedHours, weeklyBudget);
    const budgetPercentage = getBudgetPercentage(usedHours, weeklyBudget);
    const roundedUsed = Math.round(usedHours * 100) / 100;

    if (budgetStatus === 'red' && weeklyBudget > 0) {
      overspendAlerts.push({
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
        usedHours: roundedUsed,
        weeklyBudget,
        overspendHours: Math.round((usedHours - weeklyBudget) * 100) / 100,
        budgetPercentage,
      });
    }

    return {
      courseId: course.id,
      code: course.code,
      name: course.name,
      semester: course.semester,
      year: course.year,
      enrolledStudents: course.enrolledStudents,
      activeTaCount: course.assignments.length,
      pendingSubmissions: pendingCount,
      budget: {
        weeklyBudget,
        usedHours: roundedUsed,
        budgetPercentage,
        budgetStatus,
      },
    };
  });

  // Recent audit log (last 20 entries)
  const recentAudit = await prisma.auditLog.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json({
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    totalCourses: courses.length,
    totalActiveTAs: courses.reduce((sum, c) => sum + c.assignments.length, 0),
    totalPendingSubmissions,
    overspendAlerts,
    courses: courseOverviews,
    recentAudit: recentAudit.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      details: log.details,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
      user: { name: log.user.name, email: log.user.email },
    })),
  });
}
