import { z } from 'zod';

export const SubmitWeekSchema = z.object({
  assignmentId: z.string().uuid('Invalid assignment ID'),
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'weekStart must be YYYY-MM-DD format'),
});

export const RejectSubmissionSchema = z.object({
  reason: z
    .string()
    .min(1, 'Rejection reason is required')
    .max(1000, 'Reason must be 1000 characters or less'),
});

export const ExportQuerySchema = z.object({
  format: z.enum(['csv', 'pdf']).default('csv'),
});

export type SubmitWeekInput = z.infer<typeof SubmitWeekSchema>;
export type RejectSubmissionInput = z.infer<typeof RejectSubmissionSchema>;
