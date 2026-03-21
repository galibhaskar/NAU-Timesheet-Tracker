import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import type { Role } from '@prisma/client';

export interface AuthContext {
  userId: string;
  email: string;
  role: Role;
}

/** Verify JWT/session and return user context. Returns error response if not authenticated. */
export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  // Check Authorization header first (Electron app uses JWT)
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return verifyJwt(token);
  }
  // Fall back to NextAuth session (web dashboard)
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    userId: session.user.id as string,
    email: session.user.email as string,
    role: session.user.role as Role,
  };
}

/** Verify JWT from Electron app. Returns null if invalid. */
async function verifyJwt(token: string): Promise<AuthContext | null> {
  try {
    const jwt = await import('jsonwebtoken');
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      role: Role;
    };
    return { userId: payload.userId, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

/** withRole: verify user has one of the allowed roles */
export function requireRole(ctx: AuthContext | null, ...roles: Role[]): NextResponse | null {
  if (!ctx) return errors.unauthorized();
  if (!roles.includes(ctx.role)) return errors.forbidden();
  return null;
}

/** Verify user has a CourseAssignment for the given course */
export async function requireCourseAccess(
  ctx: AuthContext,
  courseId: string
): Promise<NextResponse | null> {
  if (ctx.role === 'ADMIN') return null; // Admins can access all courses
  const assignment = await prisma.courseAssignment.findFirst({
    where: { userId: ctx.userId, courseId },
  });
  if (!assignment) return errors.forbidden('Not assigned to this course');
  return null;
}

/** Verify user owns the session (via assignment chain) */
export async function requireSessionOwner(
  ctx: AuthContext,
  sessionId: string
): Promise<NextResponse | null> {
  if (ctx.role === 'ADMIN') return null;
  const session = await prisma.workSession.findUnique({
    where: { id: sessionId },
    include: { assignment: true },
  });
  if (!session) return errors.notFound('Session not found');
  if (session.assignment.userId !== ctx.userId) return errors.forbidden();
  return null;
}
