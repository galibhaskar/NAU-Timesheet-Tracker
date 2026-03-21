import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { getAuthContext, requireSessionOwner } from '@/lib/middleware/rbac';
import { uploadFile, keys, BUCKETS } from '@/lib/storage';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
  if (session.status !== 'COMPLETED') {
    return errors.conflict('Photos can only be uploaded after a session is completed');
  }
  if (session.mode !== 'IN_PERSON') {
    return errors.badRequest('Photos only available for IN_PERSON sessions');
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) return errors.badRequest('Expected multipart/form-data');

  const file = formData.get('file') as File | null;
  if (!file) return errors.badRequest('Missing file field');
  if (file.size > MAX_FILE_SIZE) return errors.badRequest('Photo must be under 10MB');
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return errors.badRequest('Photo must be a JPEG or PNG image');
  }

  const captionRaw = formData.get('caption');
  const caption = typeof captionRaw === 'string' ? captionRaw.trim() : '';
  if (!caption) return errors.badRequest('Missing caption field');
  if (caption.length > 500) return errors.badRequest('Caption must be 500 characters or less');

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadedAt = new Date();

  // Derive a safe filename: timestamp + original extension
  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const timestamp = uploadedAt.toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}.${ext}`;

  const fileKey = keys.photo(params.id, filename);

  await uploadFile(BUCKETS.photos, fileKey, buffer, file.type);

  const photo = await prisma.photo.create({
    data: {
      sessionId: params.id,
      capturedAt: uploadedAt,
      fileUrl: fileKey,
      fileSize: file.size,
      caption,
    },
  });

  return NextResponse.json({ photo }, { status: 201 });
}
