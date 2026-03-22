import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { getAuthContext, requireRole } from '@/lib/middleware/rbac';
import { getWeekStart, getWeekEnd } from '@/lib/dates';
import { getWeeklyBudget } from '@/lib/services/budget';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  const roleError = requireRole(ctx, 'TA');
  if (roleError) return roleError;
  if (!ctx) return errors.unauthorized();

  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(weekStart);
  const fourWeeksAgo = new Date(weekStart.getTime() - 28 * 24 * 60 * 60 * 1000);

  // Load all TA course assignments with this week's sessions
  const assignments = await prisma.courseAssignment.findMany({
    where: { userId: ctx.userId, role: 'TA' },
    include: {
      course: {
        select: { id: true, name: true, code: true, semester: true, year: true, enrolledStudents: true, hoursPerStudent: true, overrideWeeklyBudget: true },
      },
      sessions: {
        where: { startedAt: { gte: weekStart, lte: weekEnd } },
        select: { id: true, category: true, mode: true, status: true, description: true, startedAt: true, endedAt: true, activeMinutes: true, netHours: true },
        orderBy: { startedAt: 'asc' },
      },
    },
  });

  const assignmentData = assignments.map((a) => {
    const weeklyBudget = getWeeklyBudget(a.course);
    const totalHours = a.sessions.reduce((sum, s) => sum + Number(s.netHours), 0);

    return {
      assignmentId: a.id,
      maxWeeklyHours: a.maxWeeklyHours !== null ? Number(a.maxWeeklyHours) : weeklyBudget,
      course: { id: a.course.id, name: a.course.name, code: a.course.code, semester: a.course.semester, year: a.course.year },
      thisWeek: {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        sessions: a.sessions.map((s) => ({
          id: s.id,
          category: s.category,
          mode: s.mode,
          status: s.status,
          description: s.description,
          startedAt: s.startedAt.toISOString(),
          endedAt: s.endedAt?.toISOString() ?? null,
          activeMinutes: s.activeMinutes,
          netHours: Number(s.netHours),
        })),
        totalHours: Math.round(totalHours * 100) / 100,
      },
    };
  });

  // Recent submissions (last 4 weeks, excluding DRAFT)
  const recentSubmissions = await prisma.weeklySubmission.findMany({
    where: {
      assignment: { userId: ctx.userId },
      weekStart: { gte: fourWeeksAgo },
      status: { not: 'DRAFT' },
    },
    select: {
      id: true,
      weekStart: true,
      weekEnd: true,
      status: true,
      totalHours: true,
      submittedAt: true,
      reviewedAt: true,
      rejectionReason: true,
      assignment: {
        select: { course: { select: { id: true, name: true, code: true } } },
      },
    },
    orderBy: { weekStart: 'desc' },
    take: 20,
  });

  return NextResponse.json({
    userId: ctx.userId,
    assignments: assignmentData,
    recentSubmissions: recentSubmissions.map((s) => ({
      id: s.id,
      weekStart: s.weekStart.toISOString(),
      weekEnd: s.weekEnd.toISOString(),
      status: s.status,
      totalHours: Number(s.totalHours),
      submittedAt: s.submittedAt?.toISOString() ?? null,
      reviewedAt: s.reviewedAt?.toISOString() ?? null,
      rejectionReason: s.rejectionReason,
      course: s.assignment.course,
    })),
  });
}
