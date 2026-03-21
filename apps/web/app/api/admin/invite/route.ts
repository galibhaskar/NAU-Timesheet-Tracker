import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { getAuthContext, requireRole } from '@/lib/middleware/rbac';
import { parseBody, InviteUserSchema } from '@/lib/validators';
import { createAuditLog, getClientIp } from '@/lib/audit';
import { sendInviteEmail } from '@/lib/email';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  const roleError = requireRole(ctx, 'ADMIN');
  if (roleError) return roleError;
  if (!ctx) return errors.unauthorized();

  const body = await req.json().catch(() => null);
  if (body === null) return errors.badRequest('Request body is required');

  const { data, error } = parseBody(InviteUserSchema, body);
  if (error) return error;

  // Check if email is already registered
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });
  if (existing) {
    return errors.conflict('A user with this email address is already registered');
  }

  // Resolve course name if courseId provided
  let courseName: string | undefined;
  if (data.courseId) {
    const course = await prisma.course.findUnique({
      where: { id: data.courseId },
      select: { prefix: true, number: true, title: true },
    });
    if (!course) return errors.notFound('Course not found');
    courseName = `${course.prefix} ${course.number} - ${course.title}`;
  }

  // Generate invite token with 7-day expiry
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const inviteValue = JSON.stringify({
    email: data.email,
    role: data.role,
    name: data.name,
    courseId: data.courseId ?? null,
    courseName: courseName ?? null,
    expiresAt,
    invitedBy: ctx.userId,
  });

  // Store invite token in SystemSettings as `invite:{token}`
  await prisma.systemSettings.create({
    data: {
      key: `invite:${token}`,
      value: inviteValue,
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    },
  });

  // Send invite email
  await sendInviteEmail({
    to: data.email,
    inviteToken: token,
    role: data.role,
    courseName,
  });

  await createAuditLog({
    userId: ctx.userId,
    action: 'USER_CREATE',
    entityType: 'Invite',
    entityId: token,
    details: {
      email: data.email,
      role: data.role,
      courseId: data.courseId ?? null,
      expiresAt,
    },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json(
    { message: 'Invitation sent successfully', expiresAt },
    { status: 201 }
  );
}
