import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { getAuthContext, requireRole } from '@/lib/middleware/rbac';
import { parseBody, StartSessionSchema } from '@/lib/validators';
import { createAuditLog, getClientIp } from '@/lib/audit';
import { hasDrift } from '@/lib/dates';

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  const roleError = requireRole(ctx, 'TA');
  if (roleError) return roleError;
  if (!ctx) return errors.unauthorized();

  const body = await req.json().catch(() => null);
  const { data, error } = parseBody(StartSessionSchema, body);
  if (error) return error;

  // Verify TA is assigned to this course assignment
  const assignment = await prisma.courseAssignment.findUnique({
    where: { id: data.assignmentId },
    include: { course: true },
  });
  if (!assignment) return errors.notFound('Assignment not found');
  if (assignment.userId !== ctx.userId) return errors.forbidden();
  if (assignment.role !== 'TA') return errors.forbidden('Only TAs can start sessions');

  // Check for existing ACTIVE session across ALL assignments for this user
  const activeSession = await prisma.workSession.findFirst({
    where: {
      status: 'ACTIVE',
      assignment: { userId: ctx.userId },
    },
    select: { id: true },
  });

  if (activeSession) {
    return errors.conflict('You already have an active session', { activeSessionId: activeSession.id });
  }

  // Server-authoritative start time
  const serverNow = new Date();
  const clientTs = data.clientTimestamp ? new Date(data.clientTimestamp) : null;

  // Create session + first event in a transaction
  const session = await prisma.$transaction(async (tx) => {
    const newSession = await tx.workSession.create({
      data: {
        assignmentId: data.assignmentId,
        category: data.category,
        mode: data.mode,
        status: 'ACTIVE',
        startedAt: serverNow,
        activeMinutes: 0,
        idleMinutes: 0,
        netHours: 0,
      },
    });

    await tx.sessionEvent.create({
      data: {
        sessionId: newSession.id,
        eventType: 'STARTED',
        serverTimestamp: serverNow,
        clientTimestamp: clientTs,
      },
    });

    return newSession;
  });

  // Flag drift in audit log
  if (hasDrift(serverNow, clientTs)) {
    await createAuditLog({
      userId: ctx.userId,
      action: 'SESSION_STARTED',
      entityType: 'WorkSession',
      entityId: session.id,
      details: {
        warning: 'client_timestamp_drift',
        serverTs: serverNow.toISOString(),
        clientTs: clientTs?.toISOString(),
        driftMs: clientTs ? Math.abs(serverNow.getTime() - clientTs.getTime()) : null,
      },
      ipAddress: getClientIp(req),
    });
  } else {
    await createAuditLog({
      userId: ctx.userId,
      action: 'SESSION_STARTED',
      entityType: 'WorkSession',
      entityId: session.id,
      details: { category: data.category, mode: data.mode, course: assignment.course.code },
      ipAddress: getClientIp(req),
    });
  }

  return NextResponse.json({ session }, { status: 201 });
}
