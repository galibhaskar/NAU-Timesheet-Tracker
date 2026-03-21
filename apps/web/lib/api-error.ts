import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR'
  | 'RATE_LIMITED';

export function apiError(
  message: string,
  code: ApiErrorCode,
  status: number,
  details?: unknown
) {
  return NextResponse.json({ error: message, code, details }, { status });
}

export const errors = {
  unauthorized: (msg = 'Authentication required') => apiError(msg, 'UNAUTHORIZED', 401),
  forbidden: (msg = 'Access denied') => apiError(msg, 'FORBIDDEN', 403),
  notFound: (msg = 'Resource not found') => apiError(msg, 'NOT_FOUND', 404),
  conflict: (msg: string, details?: unknown) => apiError(msg, 'CONFLICT', 409, details),
  unprocessable: (msg: string, details?: unknown) => apiError(msg, 'UNPROCESSABLE', 422, details),
  badRequest: (msg: string, details?: unknown) => apiError(msg, 'BAD_REQUEST', 400, details),
  internal: (msg = 'Internal server error') => apiError(msg, 'INTERNAL_ERROR', 500),
};
