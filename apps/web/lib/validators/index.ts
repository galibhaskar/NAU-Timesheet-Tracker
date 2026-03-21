export * from './session';
export * from './submission';
export * from './admin';
export * from './auth';
export * from './dispute';

// Shared helper: parse and return validation error response
import { z } from 'zod';
import { errors } from '@/lib/api-error';
import { NextResponse } from 'next/server';

export function parseBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { data: T; error: null } | { data: null; error: NextResponse } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      data: null,
      error: errors.badRequest(
        'Validation failed',
        result.error.flatten().fieldErrors
      ),
    };
  }
  return { data: result.data, error: null };
}
