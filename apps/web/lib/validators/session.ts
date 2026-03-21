import { z } from 'zod';

export const StartSessionSchema = z.object({
  assignmentId: z.string().uuid('Invalid assignment ID'),
  category: z.enum(['GRADING', 'OFFICE_HOURS', 'LAB_PREP', 'TUTORING', 'MEETINGS', 'OTHER']),
  mode: z.enum(['SCREEN', 'IN_PERSON']),
  clientTimestamp: z.string().datetime({ offset: true }).optional(),
});

export const StopSessionSchema = z.object({
  description: z
    .string()
    .min(1, 'Description is required')
    .max(1000, 'Description must be 1000 characters or less'),
  clientTimestamp: z.string().datetime({ offset: true }).optional(),
});

export const PauseResumeSchema = z.object({
  clientTimestamp: z.string().datetime({ offset: true }).optional(),
});

export const ScreenshotUploadSchema = z.object({
  capturedAt: z.string().datetime({ offset: true }),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024, 'Screenshot must be under 10MB'),
});

export const PhotoUploadSchema = z.object({
  caption: z
    .string()
    .min(1, 'Caption is required')
    .max(500, 'Caption must be 500 characters or less'),
  uploadedAt: z.string().datetime({ offset: true }).optional(),
});

export type StartSessionInput = z.infer<typeof StartSessionSchema>;
export type StopSessionInput = z.infer<typeof StopSessionSchema>;
export type ScreenshotUploadInput = z.infer<typeof ScreenshotUploadSchema>;
export type PhotoUploadInput = z.infer<typeof PhotoUploadSchema>;
