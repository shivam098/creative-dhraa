import { NextRequest, NextResponse } from "next/server";
import { generatePresignedUploadUrl, isAllowedFileType, isAllowedFileSize } from "@/lib/storage/r2";
import { db } from "@/lib/db";
import { customerUploads } from "@/lib/db/schema";
import { presignRequestSchema } from "@/lib/utils/validators";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = presignRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { filename, contentType, fileSizeBytes, sessionId } = parsed.data;

    // Validate file type
    if (!isAllowedFileType(contentType)) {
      return NextResponse.json(
        { error: "File type not allowed. Use JPEG, PNG, or WebP." },
        { status: 400 }
      );
    }

    // Validate file size
    if (!isAllowedFileSize(fileSizeBytes)) {
      return NextResponse.json(
        { error: "File too large. Maximum 10MB allowed." },
        { status: 400 }
      );
    }

    // Generate a unique key for R2
    const ext = filename.split(".").pop() || "jpg";
    const uploadId = randomUUID();
    const r2Key = `uploads/${sessionId}/${uploadId}.${ext}`;

    // Generate pre-signed URL
    const { uploadUrl, publicUrl } = await generatePresignedUploadUrl(
      r2Key,
      contentType,
      fileSizeBytes
    );

    // Record upload in database with TTL
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await db.insert(customerUploads).values({
      id: uploadId,
      sessionId,
      r2Key,
      r2Url: publicUrl,
      originalFilename: filename,
      fileType: contentType,
      fileSizeBytes,
      status: "pending",
      expiresAt,
    });

    return NextResponse.json({
      uploadId,
      uploadUrl,
      publicUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Upload presign error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
