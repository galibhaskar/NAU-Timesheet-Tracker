import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { getAuthContext, requireSessionOwner } from '@/lib/middleware/rbac';
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
  if (session.status !== 'ACTIVE') {
    return errors.conflict(`Cannot pause a session with status ${session.status}`);
  }

  const serverNow = new Date();
  const body = await req.json().catch(() => ({}));
  const clientTs = body.clientTimestamp ? new Date(body.clientTimestamp) : null;

  const updatedSession = await prisma.$transaction(async (tx) => {
    await tx.sessionEvent.create({
      data: {
        sessionId: params.id,
        eventType: 'PAUSED',
        serverTimestamp: serverNow,
        clientTimestamp: clientTs,
      },
    });

    const allEvents = [...session.events, {
      eventType: 'PAUSED' as const,
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
        status: 'PAUSED',
        activeMinutes: totals.activeMinutes,
        idleMinutes: totals.idleMinutes,
        netHours: totals.netHours,
      },
    });
  });

  await createAuditLog({
    userId: ctx.userId,
    action: 'SESSION_PAUSED',
    entityType: 'WorkSession',
    entityId: params.id,
    details: { activeMinutes: updatedSession.activeMinutes },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ session: updatedSession });
}
