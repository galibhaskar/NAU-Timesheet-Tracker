import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return errors.badRequest('Token is required');

  const invite = await prisma.systemSettings.findUnique({
    where: { key: `invite:${token}` },
  });

  if (!invite) return errors.notFound('Invite not found or already used');

  const data = JSON.parse(invite.value) as { email: string; role: string; expiresAt: string; courseName?: string };
  if (new Date(data.expiresAt) < new Date()) {
    return errors.badRequest('Invite link has expired');
  }

  return NextResponse.json({ email: data.email, role: data.role, courseName: data.courseName });
}
