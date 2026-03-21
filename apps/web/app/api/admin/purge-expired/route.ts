import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errors } from '@/lib/api-error';
import { getAuthContext, requireRole } from '@/lib/middleware/rbac';
import { createAuditLog, getClientIp } from '@/lib/audit';
import { deleteFile } from '@/lib/storage';

const DEFAULT_PROOF_RETENTION_DAYS = 30;
const ABANDONED_SUBMISSION_DAYS = 90;

async function getProofRetentionDays(): Promise<number> {
  const setting = await prisma.systemSettings.findUnique({
    where: { key: 'proof_retention_days' },
  });
  if (setting) {
    const n = Number(setting.value);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return DEFAULT_PROOF_RETENTION_DAYS;
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  const roleError = requireRole(ctx, 'ADMIN');
  if (roleError) return roleError;
  if (!ctx) return errors.unauthorized();

  const retentionDays = await getProofRetentionDays();
  const retentionCutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const abandonedCutoff = new Date(Date.now() - ABANDONED_SUBMISSION_DAYS * 24 * 60 * 60 * 1000);

  let purgedScreenshots = 0;
  let purgedPhotos = 0;
  const errors_: string[] = [];

  // ── 1. Purge proofs from APPROVED submissions past retention window ──────────
  const approvedSessions = await prisma.workSession.findMany({
    where: {
      submission: {
        status: 'APPROVED',
        reviewedAt: { lte: retentionCutoff },
      },
    },
    include: {
      screenshots: true,
      photoProofs: true,
    },
  });

  for (const session of approvedSessions) {
    for (const shot of session.screenshots) {
      try {
        await deleteFile(shot.s3Bucket, shot.s3Key);
        await prisma.screenshot.delete({ where: { id: shot.id } });
        purgedScreenshots++;
      } catch (err) {
        errors_.push(`Screenshot ${shot.id}: ${String(err)}`);
      }
    }
    for (const photo of session.photoProofs) {
      try {
        await deleteFile(photo.s3Bucket, photo.s3Key);
        await prisma.photoProof.delete({ where: { id: photo.id } });
        purgedPhotos++;
      } catch (err) {
        errors_.push(`PhotoProof ${photo.id}: ${String(err)}`);
      }
    }
  }

  // ── 2. Purge abandoned DRAFT / REJECTED submissions older than 90 days ──────
  const abandonedSessions = await prisma.workSession.findMany({
    where: {
      submission: {
        status: { in: ['DRAFT', 'REJECTED'] },
        createdAt: { lte: abandonedCutoff },
      },
    },
    include: {
      screenshots: true,
      photoProofs: true,
    },
  });

  for (const session of abandonedSessions) {
    for (const shot of session.screenshots) {
      try {
        await deleteFile(shot.s3Bucket, shot.s3Key);
        await prisma.screenshot.delete({ where: { id: shot.id } });
        purgedScreenshots++;
      } catch (err) {
        errors_.push(`Screenshot ${shot.id}: ${String(err)}`);
      }
    }
    for (const photo of session.photoProofs) {
      try {
        await deleteFile(photo.s3Bucket, photo.s3Key);
        await prisma.photoProof.delete({ where: { id: photo.id } });
        purgedPhotos++;
      } catch (err) {
        errors_.push(`PhotoProof ${photo.id}: ${String(err)}`);
      }
    }
  }

  const totalPurged = purgedScreenshots + purgedPhotos;

  await createAuditLog({
    userId: ctx.userId,
    action: 'HOURS_EDIT', // closest available AuditAction for purge operations
    entityType: 'Proof',
    entityId: ctx.userId,
    details: {
      purgedScreenshots,
      purgedPhotos,
      totalPurged,
      retentionDays,
      retentionCutoff: retentionCutoff.toISOString(),
      abandonedCutoff: abandonedCutoff.toISOString(),
      partialErrors: errors_.length > 0 ? errors_ : undefined,
    },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({
    message: 'Purge completed',
    purgedScreenshots,
    purgedPhotos,
    totalPurged,
    ...(errors_.length > 0 && { partialErrors: errors_ }),
  });
}
