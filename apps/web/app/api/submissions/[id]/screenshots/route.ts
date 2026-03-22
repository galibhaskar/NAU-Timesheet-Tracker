import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { getAuthContext, requireRole } from '@/lib/middleware/rbac';
import { getPresignedUrl, BUCKETS } from '@/lib/storage';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(req);
  const roleError = requireRole(ctx, 'INSTRUCTOR', 'ADMIN');
  if (roleError) return roleError;
  if (!ctx) return errors.unauthorized();

  // Load submission with sessions and screenshots
  const submission = await prisma.weeklySubmission.findUnique({
    where: { id: params.id },
    include: {
      assignment: {
        include: {
          course: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      },
      sessions: {
        include: {
          screenshots: {
            orderBy: { capturedAt: 'asc' },
          },
        },
        orderBy: { startedAt: 'asc' },
      },
    },
  });

  if (!submission) return errors.notFound('Submission not found');

  // Instructor must be assigned to this course
  if (ctx.role === 'INSTRUCTOR') {
    const instructorAssignment = await prisma.courseAssignment.findFirst({
      where: {
        userId: ctx.userId,
        courseId: submission.assignment.courseId,
        role: 'INSTRUCTOR',
      },
    });
    if (!instructorAssignment) {
      return errors.forbidden('Not assigned as instructor for this course');
    }
  }

  // Build response with presigned URLs for each screenshot
  const sessionsWithScreenshots = await Promise.all(
    submission.sessions.map(async (session) => {
      const screenshotsWithUrls = await Promise.all(
        session.screenshots.map(async (sc) => ({
          id: sc.id,
          capturedAt: sc.capturedAt.toISOString(),
          minuteMark: sc.minuteMark,
          fileSize: sc.fileSize,
          url: await getPresignedUrl(BUCKETS.screenshots, sc.fileUrl),
          thumbnailUrl: await getPresignedUrl(BUCKETS.screenshots, sc.thumbnailUrl),
        }))
      );

      return {
        sessionId: session.id,
        category: session.category,
        mode: session.mode,
        startedAt: session.startedAt.toISOString(),
        endedAt: session.endedAt?.toISOString() ?? null,
        netHours: Number(session.netHours),
        screenshots: screenshotsWithUrls,
      };
    })
  );

  return NextResponse.json({
    submissionId: params.id,
    taName: submission.assignment.user.name,
    courseCode: submission.assignment.course.code,
    courseName: submission.assignment.course.name,
    weekStart: submission.weekStart.toISOString(),
    weekEnd: submission.weekEnd.toISOString(),
    status: submission.status,
    sessions: sessionsWithScreenshots,
  });
}
