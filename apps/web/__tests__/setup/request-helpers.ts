/**
 * Helpers for building NextRequest objects and signing test JWTs.
 *
 * Integration tests use the Bearer-token code path in getAuthContext(), which
 * skips NextAuth entirely — no running Next.js server required.
 */

import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const TEST_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-for-integration';

export function signToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    TEST_SECRET,
    { expiresIn: '1h' }
  );
}

export function makeReq(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  opts: { body?: unknown; token?: string } = {}
): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;

  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}
