/**
 * Creative Dhraa — Download Instagram Assets
 *
 * This script:
 * 1. Reads the raw Instagram data from scrape-instagram.ts output
 * 2. Downloads all post images to local disk
 * 3. Saves a manifest mapping post IDs to local file paths
 *
 * Usage: npx tsx scripts/seed/download-assets.ts
 */

import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(__dirname, "data");
const RAW_FILE = path.join(DATA_DIR, "instagram-raw.json");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const MANIFEST_FILE = path.join(DATA_DIR, "download-manifest.json");

interface InstagramPost {
  id: string;
  shortCode: string;
  caption: string;
  hashtags: string[];
  displayUrl: string;
  images: string[];
  timestamp: string;
  type: string;
}

interface DownloadManifest {
  postId: string;
  shortCode: string;
  localPaths: string[];
  caption: string;
  hashtags: string[];
  timestamp: string;
}

async function downloadImage(
  url: string,
  outputPath: string
): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) return false;

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    return true;
  } catch (error) {
    console.error(`  Failed to download: ${url}`, error);
    return false;
  }
}

function getFileExtension(url: string): string {
  // Extract extension from URL, default to .jpg
  const match = url.match(/\.(jpg|jpeg|png|webp)/i);
  return match ? `.${match[1].toLowerCase()}` : ".jpg";
}

async function main() {
  // Check raw data exists
  if (!fs.existsSync(RAW_FILE)) {
    console.error("ERROR: Raw data not found. Run scrape-instagram.ts first.");
    console.error(`  Expected: ${RAW_FILE}`);
    process.exit(1);
  }

  // Create images directory
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  // Load raw data
  const posts: InstagramPost[] = JSON.parse(fs.readFileSync(RAW_FILE, "utf-8"));
  console.log(`Loaded ${posts.length} posts from raw data`);

  // Filter to image posts only (skip videos)
  const imagePosts = posts.filter(
    (p) => p.type === "Image" || p.type === "Sidecar"
  );
  console.log(`Processing ${imagePosts.length} image posts (skipping videos)\n`);

  const manifest: DownloadManifest[] = [];
  let downloadCount = 0;
  let failCount = 0;

  for (let i = 0; i < imagePosts.length; i++) {
    const post = imagePosts[i];
    const postDir = path.join(IMAGES_DIR, post.shortCode);

    if (!fs.existsSync(postDir)) {
      fs.mkdirSync(postDir, { recursive: true });
    }

    // Collect all image URLs for this post
    const imageUrls: string[] = [];
    if (post.displayUrl) imageUrls.push(post.displayUrl);
    if (post.images && post.images.length > 0) {
      imageUrls.push(...post.images.filter((url) => !imageUrls.includes(url)));
    }

    const localPaths: string[] = [];

    for (let j = 0; j < imageUrls.length; j++) {
      const url = imageUrls[j];
      const ext = getFileExtension(url);
      const filename = `${j}${ext}`;
      const outputPath = path.join(postDir, filename);

      // Skip if already downloaded
      if (fs.existsSync(outputPath)) {
        localPaths.push(outputPath);
        continue;
      }

      const success = await downloadImage(url, outputPath);
      if (success) {
        localPaths.push(outputPath);
        downloadCount++;
      } else {
        failCount++;
      }
    }

    manifest.push({
      postId: post.id,
      shortCode: post.shortCode,
      localPaths,
      caption: post.caption || "",
      hashtags: post.hashtags || [],
      timestamp: post.timestamp,
    });

    // Progress indicator
    const progress = Math.round(((i + 1) / imagePosts.length) * 100);
    process.stdout.write(
      `\r  Progress: ${i + 1}/${imagePosts.length} (${progress}%) | Downloaded: ${downloadCount} | Failed: ${failCount}`
    );
  }

  // Save manifest
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));

  console.log(`\n\n── Download Complete ──────────────────────────`);
  console.log(`  Posts processed: ${imagePosts.length}`);
  console.log(`  Images downloaded: ${downloadCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`  Manifest saved: ${MANIFEST_FILE}`);
  console.log(`  Next step: npx tsx scripts/seed/upload-to-r2.ts`);
}

main();
