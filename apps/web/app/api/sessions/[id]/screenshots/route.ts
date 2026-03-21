import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { getAuthContext, requireSessionOwner } from '@/lib/middleware/rbac';
import { uploadFile, keys, BUCKETS } from '@/lib/storage';
import { getMinuteMark } from '@/lib/services/session-calculator';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(req);
  if (!ctx) return errors.unauthorized();

  const ownerError = await requireSessionOwner(ctx, params.id);
  if (ownerError) return ownerError;

  const session = await prisma.workSession.findUnique({ where: { id: params.id } });
  if (!session) return errors.notFound('Session not found');
  if (session.status !== 'ACTIVE') {
    return errors.conflict('Session must be ACTIVE to capture screenshots');
  }
  if (session.mode !== 'SCREEN') {
    return errors.badRequest('Screenshots only available in SCREEN mode');
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) return errors.badRequest('Expected multipart/form-data');

  const file = formData.get('file') as File | null;
  if (!file) return errors.badRequest('Missing file field');
  if (file.size > 10 * 1024 * 1024) return errors.badRequest('Screenshot must be under 10MB');

  const buffer = Buffer.from(await file.arrayBuffer());
  const capturedAt = new Date();
  const timestamp = capturedAt.toISOString().replace(/[:.]/g, '-');

  const fileKey = keys.screenshot(params.id, timestamp);
  const thumbKey = keys.screenshotThumb(params.id, timestamp);

  await uploadFile(BUCKETS.screenshots, fileKey, buffer, 'image/jpeg');
  await uploadFile(BUCKETS.screenshots, thumbKey, buffer, 'image/jpeg'); // Phase 4: real thumbnail

  const minuteMark = getMinuteMark(session.startedAt, capturedAt);

  const screenshot = await prisma.screenshot.create({
    data: {
      sessionId: params.id,
      capturedAt,
      fileUrl: fileKey,
      thumbnailUrl: thumbKey,
      fileSize: file.size,
      minuteMark,
    },
  });

  return NextResponse.json({ screenshot }, { status: 201 });
}
