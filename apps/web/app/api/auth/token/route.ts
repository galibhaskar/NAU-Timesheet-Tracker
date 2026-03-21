import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { parseBody, ElectronLoginSchema } from '@/lib/validators';
import { createAuditLog, getClientIp } from '@/lib/audit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { data, error } = parseBody(ElectronLoginSchema, body);
  if (error) return error;

  // Find user
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) return errors.unauthorized('Invalid email or password');

  // Verify password
  const valid = await bcrypt.compare(data.password, user.password);
  if (!valid) return errors.unauthorized('Invalid email or password');

  // Only TAs use the desktop app
  if (user.role !== 'TA') {
    return errors.forbidden('Desktop app is for TAs only. Use the web dashboard.');
  }

  // Generate access token
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  // Generate refresh token — store hashed in DB
  const rawToken = randomUUID();
  const hashedToken = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  // Store in SystemSettings table using a composite key pattern
  // We'll use a dedicated RefreshToken model approach via raw SQL-style upsert
  // For now, store in a JSON SystemSettings key per user (simple approach)
  // In production, add a RefreshToken model to the Prisma schema
  await prisma.systemSettings.upsert({
    where: { key: `refresh_token:${user.id}` },
    create: {
      key: `refresh_token:${user.id}`,
      value: JSON.stringify({ hash: hashedToken, expiresAt: expiresAt.toISOString() }),
      updatedBy: user.id,
      updatedAt: new Date(),
    },
    update: {
      value: JSON.stringify({ hash: hashedToken, expiresAt: expiresAt.toISOString() }),
      updatedBy: user.id,
      updatedAt: new Date(),
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'SESSION_STARTED',
    entityType: 'User',
    entityId: user.id,
    details: { event: 'desktop_login', email: user.email },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({
    accessToken,
    refreshToken: rawToken,
    expiresIn: 3600,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
