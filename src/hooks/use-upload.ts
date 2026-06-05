"use client";

import { useState, useCallback } from "react";

interface UseUploadOptions {
  maxFileSize?: number; // bytes, default 10MB
  allowedTypes?: string[];
  sessionId: string;
}

interface UploadResult {
  uploadId: string;
  r2Url: string;
  r2Key: string;
}

interface UseUploadReturn {
  upload: (file: File) => Promise<UploadResult>;
  isUploading: boolean;
  progress: number;
  error: string | null;
  reset: () => void;
}

export function useUpload(options: UseUploadOptions): UseUploadReturn {
  const {
    maxFileSize = 10 * 1024 * 1024,
    allowedTypes = ["image/jpeg", "image/png", "image/webp"],
    sessionId,
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  const upload = useCallback(
    async (file: File): Promise<UploadResult> => {
      setError(null);
      setProgress(0);

      // Client-side validation
      if (!allowedTypes.includes(file.type)) {
        const err = `Invalid file type: ${file.type}. Allowed: ${allowedTypes.join(", ")}`;
        setError(err);
        throw new Error(err);
      }

      if (file.size > maxFileSize) {
        const maxMB = Math.round(maxFileSize / 1024 / 1024);
        const err = `File too large: ${Math.round(file.size / 1024 / 1024)}MB. Maximum: ${maxMB}MB`;
        setError(err);
        throw new Error(err);
      }

      setIsUploading(true);
      setProgress(10);

      try {
        // Step 1: Get pre-signed URL from our API
        const presignResponse = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            fileSizeBytes: file.size,
            sessionId,
          }),
        });

        if (!presignResponse.ok) {
          const data = await presignResponse.json();
          throw new Error(data.error || "Failed to get upload URL");
        }

        const { uploadUrl, uploadId, publicUrl } = await presignResponse.json();
        setProgress(30);

        // Step 2: Upload directly to R2
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file to storage");
        }

        setProgress(100);

        return {
          uploadId,
          r2Url: publicUrl,
          r2Key: publicUrl.split("/").slice(-2).join("/"),
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [allowedTypes, maxFileSize, sessionId]
  );

  return { upload, isUploading, progress, error, reset };
}
