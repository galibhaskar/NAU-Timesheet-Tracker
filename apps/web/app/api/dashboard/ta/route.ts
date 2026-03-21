import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext, requireRole } from '@/lib/middleware/rbac';
import { getWeekStart, getWeekEnd } from '@/lib/dates';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  const roleError = requireRole(ctx, 'TA');
  if (roleError) return roleError;
  if (!ctx) return roleError;

  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(weekStart);

  // Four weeks back for recent submissions
  const fourWeeksAgo = new Date(weekStart.getTime() - 28 * 24 * 60 * 60 * 1000);

  // Load all active course assignments for this TA
  const assignments = await prisma.courseAssignment.findMany({
    where: {
      userId: ctx.userId,
      isActive: true,
      role: 'TA',
    },
    include: {
      course: {
        select: {
          id: true,
          prefix: true,
          number: true,
          title: true,
          semester: true,
          year: true,
          isActive: true,
        },
      },
      workSessions: {
        where: {
          startTime: { gte: weekStart, lte: weekEnd },
          status: { not: 'AUTO_STOPPED' },
        },
        select: {
          id: true,
          category: true,
          mode: true,
          status: true,
          description: true,
          startTime: true,
          endTime: true,
          netMinutes: true,
          netHours: true,
        },
        orderBy: { startTime: 'asc' },
      },
      submissions: {
        where: {
          weekStart: { gte: weekStart },
          status: 'DRAFT',
        },
        select: {
          id: true,
          weekStart: true,
          weekEnd: true,
          status: true,
          totalHours: true,
          taNote: true,
        },
        take: 1,
      },
    },
  });

  // Group sessions by category for each assignment
  const assignmentData = assignments.map((a) => {
    const sessionsByCategory: Record<string, typeof a.workSessions> = {};
    for (const session of a.workSessions) {
      const cat = session.category;
      if (!sessionsByCategory[cat]) sessionsByCategory[cat] = [];
      sessionsByCategory[cat].push(session);
    }

    const totalWeekMinutes = a.workSessions.reduce((sum, s) => sum + s.netMinutes, 0);

    return {
      assignmentId: a.id,
      maxHoursPerWeek: Number(a.maxHoursPerWeek),
      course: a.course,
      thisWeek: {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        sessions: a.workSessions,
        sessionsByCategory,
        totalHours: Math.round((totalWeekMinutes / 60) * 100) / 100,
      },
      draftSubmission: a.submissions[0] ?? null,
    };
  });

  // Recent submissions across all assignments (last 4 weeks)
  const recentSubmissions = await prisma.weeklySubmission.findMany({
    where: {
      assignment: {
        userId: ctx.userId,
        isActive: true,
      },
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
      reviewNote: true,
      assignment: {
        select: {
          course: {
            select: { id: true, prefix: true, number: true, title: true },
          },
        },
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
      weekStart: s.weekStart,
      weekEnd: s.weekEnd,
      status: s.status,
      totalHours: Number(s.totalHours),
      submittedAt: s.submittedAt,
      reviewedAt: s.reviewedAt,
      reviewNote: s.reviewNote,
      course: s.assignment.course,
    })),
  });
}
