import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true, // Required for MinIO
});

export const BUCKETS = {
  screenshots: process.env.S3_BUCKET_SCREENSHOTS ?? 'nau-timesheet-screenshots',
  photos: process.env.S3_BUCKET_PHOTOS ?? 'nau-timesheet-photos',
  exports: process.env.S3_BUCKET_EXPORTS ?? 'nau-timesheet-exports',
} as const;

/** Upload a buffer to S3. Returns the S3 key (path). */
export async function uploadFile(
  bucket: string,
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}

/** Generate a presigned GET URL (15 minutes expiry). */
export async function getPresignedUrl(bucket: string, key: string): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 900 } // 15 minutes
  );
}

/** Delete a file from S3. Used by purge job. */
export async function deleteFile(bucket: string, key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/** S3 key helpers */
export const keys = {
  screenshot: (sessionId: string, timestamp: string) =>
    `screenshots/${sessionId}/${timestamp}.jpg`,
  screenshotThumb: (sessionId: string, timestamp: string) =>
    `screenshots/${sessionId}/${timestamp}_thumb.jpg`,
  photo: (sessionId: string, filename: string) =>
    `photos/${sessionId}/${filename}`,
  export: (submissionId: string, format: 'csv' | 'pdf') =>
    `exports/${submissionId}.${format}`,
};
