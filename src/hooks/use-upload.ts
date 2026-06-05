"use client";

import { useState, useCallback } from "react";

interface UseUploadOptions {
  maxFileSize?: number; // bytes, default 10MB
  allowedTypes?: string[];
  folder?: string; // Cloudinary folder
}

interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
}

interface UseUploadReturn {
  upload: (file: File) => Promise<UploadResult>;
  isUploading: boolean;
  progress: number;
  error: string | null;
  reset: () => void;
}

export function useUpload(options: UseUploadOptions = {}): UseUploadReturn {
  const {
    maxFileSize = 10 * 1024 * 1024,
    allowedTypes = ["image/jpeg", "image/png", "image/webp"],
    folder = "customer-uploads",
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

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        const err = "Image upload is not configured. Please contact support.";
        setError(err);
        throw new Error(err);
      }

      setIsUploading(true);
      setProgress(10);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);
        formData.append("folder", folder);

        // Upload directly to Cloudinary
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: "POST", body: formData }
        );

        setProgress(80);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error?.message || "Upload failed");
        }

        const data = await response.json();
        setProgress(100);

        return {
          publicId: data.public_id,
          url: data.url,
          secureUrl: data.secure_url,
          width: data.width,
          height: data.height,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [allowedTypes, maxFileSize, folder]
  );

  return { upload, isUploading, progress, error, reset };
}
