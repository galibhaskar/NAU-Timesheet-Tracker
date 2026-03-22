import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { parseBody, AcceptInviteSchema } from '@/lib/validators';
import { createAuditLog, getClientIp } from '@/lib/audit';
import bcrypt from 'bcryptjs';

interface InvitePayload {
  email: string;
  role: 'ADMIN' | 'INSTRUCTOR' | 'TA';
  name?: string;
  courseId?: string | null;
  courseName?: string | null;
  expiresAt: string;
  invitedBy?: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (body === null) return errors.badRequest('Request body is required');

  const { data, error } = parseBody(AcceptInviteSchema, body);
  if (error) return error;

  // Look up invite token in SystemSettings
  const inviteSetting = await prisma.systemSettings.findUnique({
    where: { key: `invite:${data.token}` },
  });

  if (!inviteSetting) {
    return errors.notFound('Invite not found or already used');
  }

  let invite: InvitePayload;
  try {
    invite = JSON.parse(inviteSetting.value) as InvitePayload;
  } catch {
    return errors.internal('Invite data is malformed');
  }

  // Validate token has not expired
  if (new Date(invite.expiresAt) < new Date()) {
    return errors.badRequest('Invite link has expired');
  }

  // Check email is not already taken (race-condition guard)
  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
    select: { id: true },
  });
  if (existingUser) {
    return errors.conflict('An account with this email already exists');
  }

  // Hash the password at bcrypt cost 12
  const hashedPassword = await bcrypt.hash(data.password, 12);

  // Create the user
  const user = await prisma.user.create({
    data: {
      email: invite.email,
      password: hashedPassword,
      name: data.name,
      role: invite.role,
    },
    select: { id: true, email: true, name: true, role: true },
  });

  // Create CourseAssignment if courseId was included in the invite
  if (invite.courseId) {
    const courseRole = invite.role === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'TA';
    await prisma.courseAssignment.create({
      data: {
        userId: user.id,
        courseId: invite.courseId,
        role: courseRole,
      },
    });
  }

  // Delete the invite token (one-time use)
  await prisma.systemSettings.delete({
    where: { key: `invite:${data.token}` },
  });

  const invitedBy = inviteSetting
    ? (JSON.parse(inviteSetting.value) as InvitePayload).invitedBy ?? user.id
    : user.id;

  await createAuditLog({
    userId: user.id,
    action: 'USER_INVITED',
    entityType: 'User',
    entityId: user.id,
    details: {
      email: user.email,
      role: user.role,
      courseId: invite.courseId ?? null,
      invitedBy,
    },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json(
    {
      message: 'Account created successfully',
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    },
    { status: 201 }
  );
}
