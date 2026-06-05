import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _r2: S3Client | null = null;

function getR2(): S3Client {
  if (!_r2) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY must be set."
      );
    }
    _r2 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _r2;
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME is not set.");
  return bucket;
}

function getPublicUrl(): string {
  const url = process.env.R2_PUBLIC_URL;
  if (!url) throw new Error("R2_PUBLIC_URL is not set.");
  return url;
}

/**
 * Generate a pre-signed URL for direct client upload to R2
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  maxSizeBytes: number = 10 * 1024 * 1024 // 10MB default
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
    ContentLength: maxSizeBytes,
  });

  const uploadUrl = await getSignedUrl(getR2(), command, { expiresIn: 300 }); // 5 min

  return {
    uploadUrl,
    publicUrl: `${getPublicUrl()}/${key}`,
  };
}

/**
 * Generate a pre-signed URL for reading a private object
 */
export async function generatePresignedReadUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });

  return getSignedUrl(getR2(), command, { expiresIn });
}

/**
 * Upload a buffer directly to R2 (used by seed scripts)
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await getR2().send(command);
  return `${getPublicUrl()}/${key}`;
}

/**
 * Delete an object from R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });

  await getR2().send(command);
}

/**
 * Validate allowed file types for upload
 */
export function isAllowedFileType(mimeType: string): boolean {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  return allowed.includes(mimeType);
}

/**
 * Validate file size (max 10MB)
 */
export function isAllowedFileSize(bytes: number): boolean {
  return bytes <= 10 * 1024 * 1024;
}

export { getR2 as R2, getBucket as BUCKET, getPublicUrl as PUBLIC_URL };
