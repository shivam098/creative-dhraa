/**
 * Creative Dhraa — Upload Assets to Cloudflare R2
 *
 * This script:
 * 1. Reads the download manifest
 * 2. Uploads each image to Cloudflare R2 under /products/{shortCode}/
 * 3. Generates an upload manifest with R2 URLs
 *
 * Usage: npx tsx scripts/seed/upload-to-r2.ts
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const DATA_DIR = path.resolve(__dirname, "data");
const MANIFEST_FILE = path.join(DATA_DIR, "download-manifest.json");
const R2_MANIFEST_FILE = path.join(DATA_DIR, "r2-manifest.json");

// Initialize R2 client
const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

interface DownloadManifest {
  postId: string;
  shortCode: string;
  localPaths: string[];
  caption: string;
  hashtags: string[];
  timestamp: string;
}

interface R2Manifest {
  postId: string;
  shortCode: string;
  r2Urls: string[];
  caption: string;
  hashtags: string[];
  timestamp: string;
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  return mimeMap[ext] || "image/jpeg";
}

async function uploadFile(
  localPath: string,
  r2Key: string
): Promise<string> {
  const body = fs.readFileSync(localPath);
  const contentType = getMimeType(localPath);

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: r2Key,
    Body: body,
    ContentType: contentType,
  });

  await R2.send(command);
  return `${PUBLIC_URL}/${r2Key}`;
}

async function main() {
  // Validate env
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID) {
    console.error("ERROR: R2 credentials not set in .env.local");
    console.error("  Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL");
    process.exit(1);
  }

  // Check manifest exists
  if (!fs.existsSync(MANIFEST_FILE)) {
    console.error("ERROR: Download manifest not found. Run download-assets.ts first.");
    process.exit(1);
  }

  const manifest: DownloadManifest[] = JSON.parse(
    fs.readFileSync(MANIFEST_FILE, "utf-8")
  );
  console.log(`Uploading assets for ${manifest.length} posts to R2...\n`);

  const r2Manifest: R2Manifest[] = [];
  let uploadCount = 0;
  let failCount = 0;

  for (let i = 0; i < manifest.length; i++) {
    const item = manifest[i];
    const r2Urls: string[] = [];

    for (let j = 0; j < item.localPaths.length; j++) {
      const localPath = item.localPaths[j];
      const ext = path.extname(localPath);
      const r2Key = `products/${item.shortCode}/${j}${ext}`;

      try {
        const url = await uploadFile(localPath, r2Key);
        r2Urls.push(url);
        uploadCount++;
      } catch (error) {
        console.error(`\n  Failed: ${r2Key}`, error);
        failCount++;
      }
    }

    r2Manifest.push({
      postId: item.postId,
      shortCode: item.shortCode,
      r2Urls,
      caption: item.caption,
      hashtags: item.hashtags,
      timestamp: item.timestamp,
    });

    const progress = Math.round(((i + 1) / manifest.length) * 100);
    process.stdout.write(
      `\r  Progress: ${i + 1}/${manifest.length} (${progress}%) | Uploaded: ${uploadCount} | Failed: ${failCount}`
    );
  }

  // Save R2 manifest
  fs.writeFileSync(R2_MANIFEST_FILE, JSON.stringify(r2Manifest, null, 2));

  console.log(`\n\n── Upload Complete ──────────────────────────`);
  console.log(`  Images uploaded: ${uploadCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`  R2 manifest saved: ${R2_MANIFEST_FILE}`);
  console.log(`  Next step: npx tsx scripts/seed/seed-database.ts`);
}

main();
