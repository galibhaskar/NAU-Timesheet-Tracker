import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext, requireRole } from '@/lib/middleware/rbac';
import { getWeeklyBudget, getBudgetStatus, getBudgetPercentage } from '@/lib/services/budget';
import { getWeekStart, getWeekEnd } from '@/lib/dates';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  const roleError = requireRole(ctx, 'INSTRUCTOR');
  if (roleError) return roleError;
  if (!ctx) return roleError;

  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(weekStart);

  // Fetch courses this instructor is assigned to
  const instructorAssignments = await prisma.courseAssignment.findMany({
    where: {
      userId: ctx.userId,
      role: 'INSTRUCTOR',
      isActive: true,
    },
    select: { courseId: true },
  });

  const courseIds = instructorAssignments.map((a) => a.courseId);

  if (courseIds.length === 0) {
    return NextResponse.json({ courses: [] });
  }

  // Fetch all courses with TA assignments and their submissions
  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds }, isActive: true },
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

  const courseData = courses.map((course) => {
    const weeklyBudget = getWeeklyBudget(course);

    // Sum hours worked this week across all TA assignments for this course
    const usedHours = course.assignments.reduce((courseSum, assignment) => {
      const assignmentHours = assignment.workSessions.reduce(
        (sum, s) => sum + Number(s.netHours),
        0
      );
      return courseSum + assignmentHours;
    }, 0);

    const pendingSubmissions = course.assignments.reduce(
      (sum, a) => sum + a.submissions.length,
      0
    );

    const budgetStatus = getBudgetStatus(usedHours, weeklyBudget);
    const budgetPercentage = getBudgetPercentage(usedHours, weeklyBudget);

    return {
      courseId: course.id,
      courseName: `${course.prefix} ${course.number} - ${course.title}`,
      prefix: course.prefix,
      number: course.number,
      title: course.title,
      semester: course.semester,
      year: course.year,
      enrolledStudents: course.enrolledStudents,
      hoursPerStudent: Number(course.hoursPerStudent),
      pendingSubmissions,
      budget: {
        weeklyBudget,
        usedHours: Math.round(usedHours * 100) / 100,
        budgetPercentage,
        budgetStatus,
      },
    };
  });

  return NextResponse.json({ courses: courseData });
}
