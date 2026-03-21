import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { parseBody, RefreshTokenSchema } from '@/lib/validators';
import { createHash, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { data, error } = parseBody(RefreshTokenSchema, body);
  if (error) return error;

  const hashedToken = createHash('sha256').update(data.refreshToken).digest('hex');

  // Find which user owns this refresh token by scanning (simple approach for v1)
  // In production, use a dedicated RefreshToken table
  const settings = await prisma.systemSettings.findMany({
    where: { key: { startsWith: 'refresh_token:' } },
  });

  let userId: string | null = null;
  let storedData: { hash: string; expiresAt: string } | null = null;

  for (const setting of settings) {
    const parsed = JSON.parse(setting.value) as { hash: string; expiresAt: string };
    if (parsed.hash === hashedToken) {
      userId = setting.key.replace('refresh_token:', '');
      storedData = parsed;
      break;
    }
  }

  if (!userId || !storedData) return errors.unauthorized('Invalid refresh token');

  // Check expiry
  if (new Date(storedData.expiresAt) < new Date()) {
    // Clean up expired token
    await prisma.systemSettings.delete({ where: { key: `refresh_token:${userId}` } });
    return errors.unauthorized('Refresh token expired. Please log in again.');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return errors.unauthorized('User not found');

  // Rotate: generate new tokens
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const newRawToken = randomUUID();
  const newHashedToken = createHash('sha256').update(newRawToken).digest('hex');
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  // Invalidate old token, store new
  await prisma.systemSettings.update({
    where: { key: `refresh_token:${userId}` },
    data: {
      value: JSON.stringify({ hash: newHashedToken, expiresAt: newExpiresAt.toISOString() }),
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({
    accessToken,
    refreshToken: newRawToken,
    expiresIn: 3600,
  });
}
