import { z } from 'zod';

export const ElectronLoginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type ElectronLoginInput = z.infer<typeof ElectronLoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
