import { z } from 'zod';

export const InviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'INSTRUCTOR', 'TA']),
  courseId: z.string().uuid('Invalid course ID').optional(),
  name: z.string().min(1, 'Name is required').max(100).optional(),
});

export const UpdateSettingsSchema = z.object({
  idle_timeout_minutes: z
    .number()
    .int()
    .min(1)
    .max(60)
    .optional(),
  proof_retention_days: z
    .number()
    .int()
    .min(7)
    .max(365)
    .optional(),
  screenshot_interval_min: z
    .number()
    .int()
    .min(1)
    .max(30)
    .optional(),
  screenshot_interval_max: z
    .number()
    .int()
    .min(1)
    .max(60)
    .optional(),
}).refine(
  (data) => {
    if (data.screenshot_interval_min !== undefined && data.screenshot_interval_max !== undefined) {
      return data.screenshot_interval_min < data.screenshot_interval_max;
    }
    return true;
  },
  { message: 'screenshot_interval_min must be less than screenshot_interval_max' }
);

export const UpdateBudgetSchema = z.object({
  hoursPerStudent: z
    .number()
    .positive('Hours per student must be positive')
    .max(10, 'Hours per student cannot exceed 10')
    .optional(),
  overrideWeeklyBudget: z
    .number()
    .positive('Override budget must be positive')
    .max(1000)
    .nullable()
    .optional(),
});

export const AuditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  action: z
    .enum([
      'SESSION_STARTED', 'SESSION_PAUSED', 'SESSION_RESUMED', 'SESSION_STOPPED',
      'SUBMITTED', 'APPROVED', 'REJECTED', 'EXPORTED', 'SETTINGS_CHANGED',
      'USER_INVITED', 'PROOF_PURGED', 'BUDGET_CHANGED', 'DISPUTE_HOLD_TOGGLED',
    ])
    .optional(),
  userId: z.string().uuid().optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export const AcceptInviteSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100),
  name: z.string().min(1, 'Name is required').max(100),
});

export type InviteUserInput = z.infer<typeof InviteUserSchema>;
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
export type UpdateBudgetInput = z.infer<typeof UpdateBudgetSchema>;
export type AuditLogQueryInput = z.infer<typeof AuditLogQuerySchema>;
export type AcceptInviteInput = z.infer<typeof AcceptInviteSchema>;
