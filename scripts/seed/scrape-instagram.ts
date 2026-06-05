/**
 * Creative Dhraa — Instagram Scraper via Apify
 *
 * This script:
 * 1. Calls the Apify Instagram Profile Scraper actor
 * 2. Waits for the run to complete
 * 3. Downloads the dataset (all posts with images, captions, hashtags)
 * 4. Saves raw data to scripts/seed/data/instagram-raw.json
 *
 * Usage: npx tsx scripts/seed/scrape-instagram.ts
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const INSTAGRAM_USERNAME = "creative_dhraa";
const OUTPUT_DIR = path.resolve(__dirname, "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "instagram-raw.json");

if (!APIFY_TOKEN) {
  console.error("ERROR: APIFY_API_TOKEN not set in .env.local");
  process.exit(1);
}

interface ApifyRunResponse {
  data: {
    id: string;
    status: string;
    defaultDatasetId: string;
  };
}

interface InstagramPost {
  id: string;
  shortCode: string;
  caption: string;
  hashtags: string[];
  url: string;
  displayUrl: string;
  images: string[];
  timestamp: string;
  likesCount: number;
  commentsCount: number;
  type: string; // "Image", "Sidecar", "Video"
}

async function startScraper(): Promise<ApifyRunResponse> {
  console.log(`Starting Apify scraper for @${INSTAGRAM_USERNAME}...`);

  const response = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs?token=${APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernames: [INSTAGRAM_USERNAME],
        resultsLimit: 200,
        addParentData: true,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to start scraper: ${response.status} - ${error}`);
  }

  return response.json();
}

async function waitForCompletion(runId: string): Promise<string> {
  console.log(`Waiting for run ${runId} to complete...`);

  const maxWait = 10 * 60 * 1000; // 10 minutes
  const pollInterval = 10 * 1000; // 10 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const response = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );

    const data = await response.json();
    const status = data.data.status;

    console.log(`  Status: ${status} (elapsed: ${Math.round((Date.now() - startTime) / 1000)}s)`);

    if (status === "SUCCEEDED") {
      return data.data.defaultDatasetId;
    }

    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new Error(`Scraper run ${status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error("Scraper timed out after 10 minutes");
}

async function downloadDataset(datasetId: string): Promise<InstagramPost[]> {
  console.log(`Downloading dataset ${datasetId}...`);

  const response = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&format=json`
  );

  if (!response.ok) {
    throw new Error(`Failed to download dataset: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

async function main() {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Step 1: Start the scraper
    const runResponse = await startScraper();
    const runId = runResponse.data.id;
    console.log(`Run started: ${runId}`);

    // Step 2: Wait for completion
    const datasetId = await waitForCompletion(runId);
    console.log(`Dataset ready: ${datasetId}`);

    // Step 3: Download results
    const posts = await downloadDataset(datasetId);
    console.log(`Downloaded ${posts.length} posts`);

    // Step 4: Save raw data
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(posts, null, 2));
    console.log(`\nRaw data saved to: ${OUTPUT_FILE}`);

    // Step 5: Print summary
    const imageCount = posts.filter(
      (p) => p.type === "Image" || p.type === "Sidecar"
    ).length;
    const videoCount = posts.filter((p) => p.type === "Video").length;

    console.log(`\n── Summary ──────────────────────────`);
    console.log(`  Total posts:  ${posts.length}`);
    console.log(`  Images:       ${imageCount}`);
    console.log(`  Videos:       ${videoCount}`);
    console.log(`  Ready for next step: npx tsx scripts/seed/download-assets.ts`);
  } catch (error) {
    console.error("\nScraper failed:", error);
    process.exit(1);
  }
}

main();
