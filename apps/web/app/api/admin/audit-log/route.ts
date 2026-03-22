import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { getAuthContext, requireRole } from '@/lib/middleware/rbac';
import { parseBody, AuditLogQuerySchema } from '@/lib/validators';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  const roleError = requireRole(ctx, 'ADMIN');
  if (roleError) return roleError;

  // Parse query params as an object for Zod
  const url = req.nextUrl;
  const raw: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    raw[key] = value;
  });

  const { data, error } = parseBody(AuditLogQuerySchema, raw);
  if (error) return error;

  const page = data.page ?? 1;
  const limit = data.limit ?? 50;
  const { action, userId, entityType, entityId, from, to } = data;
  const skip = (page - 1) * limit;

  // Build the where clause
  const where: Prisma.AuditLogWhereInput = {};

  if (action) {
    // Map the spec's action names to the Prisma AuditAction enum values used in schema
    const actionMap: Record<string, string> = {
      SESSION_STARTED: 'SESSION_START',
      SESSION_PAUSED: 'SESSION_STOP',   // no PAUSED in schema — nearest match skipped
      SESSION_RESUMED: 'SESSION_START', // no RESUMED in schema
      SESSION_STOPPED: 'SESSION_STOP',
      SUBMITTED: 'SUBMISSION_SUBMIT',
      APPROVED: 'SUBMISSION_APPROVE',
      REJECTED: 'SUBMISSION_REJECT',
      EXPORTED: 'SESSION_STOP',         // placeholder
      SETTINGS_CHANGED: 'SETTINGS_UPDATE',
      USER_INVITED: 'USER_CREATE',
      PROOF_PURGED: 'HOURS_EDIT',       // placeholder
      BUDGET_CHANGED: 'COURSE_UPDATE',
      DISPUTE_HOLD_TOGGLED: 'HOURS_EDIT',
    };
    const mapped = actionMap[action] ?? action;
    (where as Record<string, unknown>).action = mapped;
  }
  if (userId) where.userId = userId;
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;

  if (from || to) {
    (where as Record<string, unknown>).createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [totalCount, entries] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  const results = entries.map((entry) => ({
    id: entry.id,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    details: entry.details ?? null,
    ipAddress: entry.ipAddress,
    createdAt: entry.createdAt,
    user: entry.user
      ? { id: entry.user.id, name: entry.user.name, email: entry.user.email }
      : null,
  }));

  return NextResponse.json({
    data: results,
    totalCount,
    page,
    limit,
    totalPages,
  });
}
