import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { getAuthContext, requireRole } from '@/lib/middleware/rbac';
import { parseBody, UpdateSettingsSchema } from '@/lib/validators';
import { createAuditLog, getClientIp } from '@/lib/audit';

const ALLOWED_KEYS = [
  'idle_timeout_minutes',
  'proof_retention_days',
  'screenshot_interval_min',
  'screenshot_interval_max',
] as const;

type AllowedKey = (typeof ALLOWED_KEYS)[number];

const DEFAULT_SETTINGS: Record<AllowedKey, string> = {
  idle_timeout_minutes: '5',
  proof_retention_days: '30',
  screenshot_interval_min: '3',
  screenshot_interval_max: '10',
};

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  const roleError = requireRole(ctx, 'ADMIN');
  if (roleError) return roleError;

  const settings = await prisma.systemSettings.findMany({
    where: { key: { in: [...ALLOWED_KEYS] } },
  });

  // Merge DB values over defaults; coerce numeric strings to numbers
  const result: Record<string, string | number> = { ...DEFAULT_SETTINGS };
  for (const s of settings) {
    const num = Number(s.value);
    result[s.key] = Number.isNaN(num) ? s.value : num;
  }

  return NextResponse.json({ settings: result });
}

export async function PUT(req: NextRequest) {
  const ctx = await getAuthContext(req);
  const roleError = requireRole(ctx, 'ADMIN');
  if (roleError) return roleError;
  if (!ctx) return errors.unauthorized();

  const body = await req.json().catch(() => null);
  if (body === null) return errors.badRequest('Request body is required');

  const { data, error } = parseBody(UpdateSettingsSchema, body);
  if (error) return error;

  const updates = (Object.entries(data) as [AllowedKey, number | undefined][]).filter(
    ([, v]) => v !== undefined
  ) as [AllowedKey, number][];

  if (updates.length === 0) {
    return errors.badRequest('No valid settings fields provided');
  }

  const ip = getClientIp(req);

  for (const [key, value] of updates) {
    const oldSetting = await prisma.systemSettings.findUnique({ where: { key } });
    const oldValue = oldSetting?.value ?? DEFAULT_SETTINGS[key] ?? null;

    await prisma.systemSettings.upsert({
      where: { key },
      create: {
        key,
        value: String(value),
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      },
      update: {
        value: String(value),
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      },
    });

    await createAuditLog({
      userId: ctx.userId,
      action: 'SETTINGS_CHANGED',
      entityType: 'SystemSettings',
      entityId: key,
      details: { key, oldValue, newValue: String(value) },
      ipAddress: ip,
    });
  }

  return NextResponse.json({ message: 'Settings updated successfully' });
}
