import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { getAuthContext } from '@/lib/middleware/rbac';
import { parseBody, ExportQuerySchema } from '@/lib/validators';
import { createAuditLog, getClientIp } from '@/lib/audit';
import { uploadFile, getPresignedUrl, BUCKETS, keys } from '@/lib/storage';
import { formatPhoenix } from '@/lib/dates';

export async function GET(
  req: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  const ctx = await getAuthContext(req);
  if (!ctx) return errors.unauthorized();

  // Parse query params
  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const { data: query, error: queryError } = parseBody(ExportQuerySchema, searchParams);
  if (queryError) return queryError;

  const { format } = query;

  // Load submission with full session data
  const submission = await prisma.weeklySubmission.findUnique({
    where: { id: params.submissionId },
    include: {
      assignment: {
        include: {
          course: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      sessions: {
        where: { status: 'COMPLETED' },
        orderBy: { startedAt: 'asc' },
        select: {
          id: true,
          category: true,
          mode: true,
          startedAt: true,
          netHours: true,
          description: true,
        },
      },
    },
  });

  if (!submission) return errors.notFound('Submission not found');

  // Submission must be APPROVED to export
  if (submission.status !== 'APPROVED') {
    return errors.unprocessable('Only approved submissions can be exported');
  }

  // Authorization check by role
  if (ctx.role === 'TA') {
    // TA can only export their own submissions
    if (submission.assignment.userId !== ctx.userId) {
      return errors.forbidden('You can only export your own submissions');
    }
  } else if (ctx.role === 'INSTRUCTOR') {
    // Instructor must be assigned to this course
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
  // ADMIN: no additional check required

  // PDF stub — Phase 4 implementation
  if (format === 'pdf') {
    return NextResponse.json(
      { message: 'PDF generation coming in Phase 4' },
      { status: 200 }
    );
  }

  // CSV export
  const s3Key = keys.export(params.submissionId, 'csv');

  // Check S3 cache first (only on first export; after that mark exported)
  if (submission.exported) {
    try {
      const cachedUrl = await getPresignedUrl(BUCKETS.exports, s3Key);
      return NextResponse.redirect(cachedUrl, { status: 302 });
    } catch {
      // Cache miss — regenerate below
    }
  }

  // Generate CSV
  const course = submission.assignment.course;
  const courseLabel = `${course.code}`;
  const weekLabel = formatPhoenix(submission.weekStart, 'yyyy-MM-dd');

  const csvLines: string[] = [
    'Week,Course,Category,Date,Mode,Hours,Description',
  ];

  let totalHours = 0;

  for (const session of submission.sessions) {
    const date = formatPhoenix(session.startedAt, 'yyyy-MM-dd');
    const hours = Number(session.netHours);
    totalHours += hours;
    const description = session.description
      ? `"${session.description.replace(/"/g, '""')}"`
      : '""';
    csvLines.push(
      `${weekLabel},${courseLabel},${session.category},${date},${session.mode},${hours.toFixed(2)},${description}`
    );
  }

  // Total row
  csvLines.push(`TOTAL,,,,,${totalHours.toFixed(2)},`);

  const csvContent = csvLines.join('\n');
  const csvBuffer = Buffer.from(csvContent, 'utf-8');

  // Upload to S3 cache
  await uploadFile(BUCKETS.exports, s3Key, csvBuffer, 'text/csv');

  // Mark submission as exported on first export
  if (!submission.exported) {
    await prisma.weeklySubmission.update({
      where: { id: params.submissionId },
      data: {
        exported: true,
        exportedAt: new Date(),
      },
    });
  }

  await createAuditLog({
    userId: ctx.userId,
    action: 'EXPORTED',
    entityType: 'WeeklySubmission',
    entityId: params.submissionId,
    details: {
      format,
      weekStart: submission.weekStart.toISOString(),
      courseId: submission.assignment.courseId,
      totalHours: totalHours.toFixed(2),
      sessionCount: submission.sessions.length,
    },
    ipAddress: getClientIp(req),
  });

  // Return CSV directly as a download
  return new NextResponse(csvBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="timesheet-${courseLabel.replace(' ', '-')}-${weekLabel}.csv"`,
      'Content-Length': String(csvBuffer.byteLength),
    },
  });
}
