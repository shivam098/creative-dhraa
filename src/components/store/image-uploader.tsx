"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useUpload } from "@/hooks/use-upload";

interface UploadedImage {
  uploadId: string;
  publicUrl: string;
  filename: string;
}

interface ImageUploaderProps {
  sessionId: string;
  maxFiles?: number;
  onUploadComplete: (images: UploadedImage[]) => void;
}

export default function ImageUploader({
  sessionId,
  maxFiles = 5,
  onUploadComplete,
}: ImageUploaderProps) {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const { upload, isUploading, progress, error } = useUpload({
    folder: `customer-uploads/${sessionId}`,
  });

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remaining = maxFiles - uploadedImages.length;

      if (remaining <= 0) return;

      const filesToUpload = fileArray.slice(0, remaining);

      const results: UploadedImage[] = [];

      for (const file of filesToUpload) {
        try {
          const result = await upload(file);
          if (result) {
            results.push({
              uploadId: result.publicId,
              publicUrl: result.secureUrl,
              filename: file.name,
            });
          }
        } catch (err) {
          console.error("Upload failed:", err);
        }
      }

      const newImages = [...uploadedImages, ...results];
      setUploadedImages(newImages);
      onUploadComplete(newImages);
    },
    [uploadedImages, maxFiles, upload, onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const removeImage = (uploadId: string) => {
    const newImages = uploadedImages.filter((img) => img.uploadId !== uploadId);
    setUploadedImages(newImages);
    onUploadComplete(newImages);
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all ${
          dragActive
            ? "border-accent bg-accent/5"
            : "border-border hover:border-accent/50 hover:bg-surface"
        }`}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={isUploading || uploadedImages.length >= maxFiles}
        />

        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className={`h-8 w-8 ${dragActive ? "text-accent" : "text-muted"}`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>

        <p className="mt-2 text-sm text-muted">
          {isUploading ? (
            "Uploading..."
          ) : uploadedImages.length >= maxFiles ? (
            `Maximum ${maxFiles} images reached`
          ) : (
            <>
              <span className="text-accent font-medium">Click to upload</span>{" "}
              or drag and drop
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-muted">
          JPEG, PNG, or WebP (max 10MB each)
        </p>

        {/* Upload Progress */}
        {isUploading && (
          <div className="mt-3 w-full max-w-xs">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full rounded-full bg-accent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}

      {/* Uploaded Previews */}
      <AnimatePresence>
        {uploadedImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="grid grid-cols-3 sm:grid-cols-4 gap-3"
          >
            {uploadedImages.map((img) => (
              <motion.div
                key={img.uploadId}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border"
              >
                <Image
                  src={img.publicUrl}
                  alt={img.filename}
                  fill
                  className="object-cover"
                  sizes="100px"
                />
                <button
                  onClick={() => removeImage(img.uploadId)}
                  className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-error opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-xs text-muted">
        {uploadedImages.length}/{maxFiles} images uploaded
      </p>
    </div>
  );
}
