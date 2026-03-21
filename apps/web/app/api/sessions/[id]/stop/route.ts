import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { getAuthContext, requireSessionOwner } from '@/lib/middleware/rbac';
import { parseBody, StopSessionSchema } from '@/lib/validators';
import { createAuditLog, getClientIp } from '@/lib/audit';
import { computeSessionTotals } from '@/lib/services/session-calculator';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(req);
  if (!ctx) return errors.unauthorized();

  const ownerError = await requireSessionOwner(ctx, params.id);
  if (ownerError) return ownerError;

  const session = await prisma.workSession.findUnique({
    where: { id: params.id },
    include: { events: true },
  });
  if (!session) return errors.notFound('Session not found');
  if (session.status === 'COMPLETED') {
    return errors.conflict('Session is already completed');
  }
  if (session.status !== 'ACTIVE' && session.status !== 'PAUSED') {
    return errors.conflict(`Cannot stop a session with status ${session.status}`);
  }

  const body = await req.json().catch(() => null);
  const { data, error } = parseBody(StopSessionSchema, body);
  if (error) return error;

  const serverNow = new Date();
  const clientTs = data.clientTimestamp ? new Date(data.clientTimestamp) : null;

  const updatedSession = await prisma.$transaction(async (tx) => {
    await tx.sessionEvent.create({
      data: {
        sessionId: params.id,
        eventType: 'STOPPED',
        serverTimestamp: serverNow,
        clientTimestamp: clientTs,
      },
    });

    const allEvents = [...session.events, {
      eventType: 'STOPPED' as const,
      serverTimestamp: serverNow,
      clientTimestamp: clientTs,
      id: '',
      sessionId: params.id,
      createdAt: serverNow,
    }];
    const totals = computeSessionTotals(allEvents);

    return tx.workSession.update({
      where: { id: params.id },
      data: {
        status: 'COMPLETED',
        endedAt: serverNow,
        description: data.description,
        activeMinutes: totals.activeMinutes,
        idleMinutes: totals.idleMinutes,
        netHours: totals.netHours,
      },
    });
  });

  await createAuditLog({
    userId: ctx.userId,
    action: 'SESSION_STOPPED',
    entityType: 'WorkSession',
    entityId: params.id,
    details: {
      activeMinutes: updatedSession.activeMinutes,
      idleMinutes: updatedSession.idleMinutes,
      netHours: updatedSession.netHours,
    },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ session: updatedSession });
}
