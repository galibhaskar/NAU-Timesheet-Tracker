import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext, requireRole } from '@/lib/middleware/rbac';
import { getWeeklyBudget, getBudgetStatus, getBudgetPercentage } from '@/lib/services/budget';
import { getWeekStart, getWeekEnd } from '@/lib/dates';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  const roleError = requireRole(ctx, 'ADMIN');
  if (roleError) return roleError;

  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(weekStart);

  // Fetch all active courses with TA assignments, sessions, and submissions
  const courses = await prisma.course.findMany({
    where: { isActive: true },
    include: {
      assignments: {
        where: { role: 'TA', isActive: true },
        include: {
          submissions: {
            where: { status: 'SUBMITTED' },
            select: { id: true },
          },
          workSessions: {
            where: {
              startTime: { gte: weekStart, lte: weekEnd },
            },
            select: { netHours: true },
          },
        },
      },
    },
    orderBy: [{ year: 'desc' }, { prefix: 'asc' }, { number: 'asc' }],
  });

  let totalPendingSubmissions = 0;
  const overspendAlerts: Array<{
    courseId: string;
    courseName: string;
    usedHours: number;
    weeklyBudget: number;
    overspendHours: number;
    budgetPercentage: number;
  }> = [];

  const courseOverviews = courses.map((course) => {
    const weeklyBudget = getWeeklyBudget(course);

    const usedHours = course.assignments.reduce((courseSum, assignment) => {
      const assignmentHours = assignment.workSessions.reduce(
        (sum, s) => sum + Number(s.netHours),
        0
      );
      return courseSum + assignmentHours;
    }, 0);

    const pendingCount = course.assignments.reduce(
      (sum, a) => sum + a.submissions.length,
      0
    );
    totalPendingSubmissions += pendingCount;

    const budgetStatus = getBudgetStatus(usedHours, weeklyBudget);
    const budgetPercentage = getBudgetPercentage(usedHours, weeklyBudget);
    const roundedUsed = Math.round(usedHours * 100) / 100;

    // Collect overspend alerts
    if (budgetStatus === 'red' && weeklyBudget > 0) {
      overspendAlerts.push({
        courseId: course.id,
        courseName: `${course.prefix} ${course.number} - ${course.title}`,
        usedHours: roundedUsed,
        weeklyBudget,
        overspendHours: Math.round((usedHours - weeklyBudget) * 100) / 100,
        budgetPercentage,
      });
    }

    return {
      courseId: course.id,
      courseName: `${course.prefix} ${course.number} - ${course.title}`,
      prefix: course.prefix,
      number: course.number,
      title: course.title,
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

  return NextResponse.json({
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    totalCourses: courses.length,
    totalPendingSubmissions,
    overspendAlerts,
    courses: courseOverviews,
  });
}
