import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { getAuthContext, requireRole } from '@/lib/middleware/rbac';
import { getWeekStart, getWeekEnd } from '@/lib/dates';

const OVERCOMMITMENT_THRESHOLD_HOURS = 20;

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const ctx = await getAuthContext(req);
  if (!ctx) return errors.unauthorized();

  const { userId } = await context.params;

  // ADMIN can access any TA; INSTRUCTOR can only access TAs in their courses
  if (ctx.role === 'ADMIN') {
    // Full access — no further check needed
  } else if (ctx.role === 'INSTRUCTOR') {
    // Verify the target TA is in at least one of this instructor's courses
    const sharedCourse = await prisma.courseAssignment.findFirst({
      where: {
        userId,
        role: 'TA',
        isActive: true,
        course: {
          assignments: {
            some: {
              userId: ctx.userId,
              role: 'INSTRUCTOR',
              isActive: true,
            },
          },
        },
      },
    });
    if (!sharedCourse) {
      return errors.forbidden('This TA is not assigned to any of your courses');
    }
  } else {
    return errors.forbidden();
  }

  // Confirm target user exists and is a TA
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  if (!targetUser) return errors.notFound('User not found');
  if (targetUser.role !== 'TA') {
    return errors.badRequest('User is not a TA');
  }

  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(weekStart);

  // Fetch all active TA assignments with their sessions this week
  const assignments = await prisma.courseAssignment.findMany({
    where: {
      userId,
      role: 'TA',
      isActive: true,
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
        },
      },
      workSessions: {
        where: {
          startTime: { gte: weekStart, lte: weekEnd },
        },
        select: { netHours: true, netMinutes: true },
      },
    },
  });

  let totalWeeklyHours = 0;

  const perCourse = assignments.map((a) => {
    const courseMinutes = a.workSessions.reduce((sum, s) => sum + s.netMinutes, 0);
    const courseHours = Math.round((courseMinutes / 60) * 100) / 100;
    totalWeeklyHours += courseHours;

    return {
      assignmentId: a.id,
      courseId: a.course.id,
      courseName: `${a.course.prefix} ${a.course.number} - ${a.course.title}`,
      course: a.course,
      maxHoursPerWeek: Number(a.maxHoursPerWeek),
      hoursThisWeek: courseHours,
    };
  });

  totalWeeklyHours = Math.round(totalWeeklyHours * 100) / 100;
  const isOvercommitted = totalWeeklyHours > OVERCOMMITMENT_THRESHOLD_HOURS;

  return NextResponse.json({
    taUserId: userId,
    taName: targetUser.name,
    taEmail: targetUser.email,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    totalWeeklyHours,
    overcommitmentThreshold: OVERCOMMITMENT_THRESHOLD_HOURS,
    isOvercommitted,
    ...(isOvercommitted && {
      overcommitmentWarning: `TA has logged ${totalWeeklyHours}h this week, exceeding the ${OVERCOMMITMENT_THRESHOLD_HOURS}h recommended maximum.`,
    }),
    courses: perCourse,
  });
}
