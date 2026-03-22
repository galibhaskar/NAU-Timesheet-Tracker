import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { getAuthContext, requireRole } from '@/lib/middleware/rbac';
import { parseBody, UpdateBudgetSchema } from '@/lib/validators';
import { createAuditLog, getClientIp } from '@/lib/audit';
import { getWeeklyBudget } from '@/lib/services/budget';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const ctx = await getAuthContext(req);
  const roleError = requireRole(ctx, 'ADMIN');
  if (roleError) return roleError;

  const { id } = await context.params;

  const course = await prisma.course.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      enrolledStudents: true,
      hoursPerStudent: true,
      overrideWeeklyBudget: true,
    },
  });

  if (!course) return errors.notFound('Course not found');

  const weeklyBudget = getWeeklyBudget(course);

  return NextResponse.json({
    courseId: course.id,
    courseName: `${course.code} - ${course.name}`,
    enrolledStudents: course.enrolledStudents,
    hoursPerStudent: Number(course.hoursPerStudent),
    overrideWeeklyBudget: course.overrideWeeklyBudget !== null
      ? Number(course.overrideWeeklyBudget)
      : null,
    computedWeeklyBudget: Number(course.enrolledStudents) * Number(course.hoursPerStudent),
    effectiveWeeklyBudget: weeklyBudget,
  });
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const ctx = await getAuthContext(req);
  const roleError = requireRole(ctx, 'ADMIN');
  if (roleError) return roleError;
  if (!ctx) return errors.unauthorized();

  const { id } = await context.params;

  const course = await prisma.course.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      enrolledStudents: true,
      hoursPerStudent: true,
      overrideWeeklyBudget: true,
    },
  });

  if (!course) return errors.notFound('Course not found');

  const body = await req.json().catch(() => null);
  if (body === null) return errors.badRequest('Request body is required');

  const { data, error } = parseBody(UpdateBudgetSchema, body);
  if (error) return error;

  const oldBudget = getWeeklyBudget(course);

  const updated = await prisma.course.update({
    where: { id },
    data: {
      ...(data.hoursPerStudent !== undefined && {
        hoursPerStudent: data.hoursPerStudent,
      }),
      ...(data.overrideWeeklyBudget !== undefined && {
        overrideWeeklyBudget: data.overrideWeeklyBudget,
      }),
    },
    select: {
      id: true,
      code: true,
      name: true,
      enrolledStudents: true,
      hoursPerStudent: true,
      overrideWeeklyBudget: true,
    },
  });

  const newBudget = getWeeklyBudget(updated);

  await createAuditLog({
    userId: ctx.userId,
    action: 'BUDGET_CHANGED',
    entityType: 'Course',
    entityId: id,
    details: {
      changes: data,
      oldEffectiveBudget: oldBudget,
      newEffectiveBudget: newBudget,
    },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({
    courseId: updated.id,
    courseName: `${updated.code} - ${updated.name}`,
    enrolledStudents: updated.enrolledStudents,
    hoursPerStudent: Number(updated.hoursPerStudent),
    overrideWeeklyBudget: updated.overrideWeeklyBudget !== null
      ? Number(updated.overrideWeeklyBudget)
      : null,
    computedWeeklyBudget: Number(updated.enrolledStudents) * Number(updated.hoursPerStudent),
    effectiveWeeklyBudget: newBudget,
  });
}
