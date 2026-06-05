/**
 * Creative Dhraa — Scrape Instagram & Seed Database (Combined)
 *
 * This script:
 * 1. Calls Apify Instagram Profile Scraper for @creative_dhraa
 * 2. Waits for completion
 * 3. Directly inserts products into the DB using Instagram CDN URLs
 *
 * Usage: npx tsx scripts/seed/scrape-and-seed.ts
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../../src/lib/db/schema";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;
const INSTAGRAM_USERNAME = "creative_dhraa";
const DATA_DIR = path.resolve(__dirname, "data");

if (!APIFY_TOKEN) {
  console.error("ERROR: APIFY_API_TOKEN not set in .env");
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not set in .env");
  process.exit(1);
}

// ─── Types ──────────────────────────────────────────────────────────────────

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
  images?: string[];
  childPosts?: Array<{ displayUrl: string }>;
  timestamp: string;
  likesCount: number;
  commentsCount: number;
  type: string;
}

// ─── Apify Calls ────────────────────────────────────────────────────────────

async function startScraper(): Promise<ApifyRunResponse> {
  console.log(`\n🔍 Starting Apify scraper for @${INSTAGRAM_USERNAME}...`);

  const response = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs?token=${APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernames: [INSTAGRAM_USERNAME],
        resultsLimit: 100,
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
  console.log(`⏳ Waiting for run ${runId}...`);

  const maxWait = 10 * 60 * 1000;
  const pollInterval = 10 * 1000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const response = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );

    const data = await response.json();
    const status = data.data.status;
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    process.stdout.write(`\r   Status: ${status} (${elapsed}s elapsed)    `);

    if (status === "SUCCEEDED") {
      console.log("");
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
  console.log(`📥 Downloading dataset...`);

  const response = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&format=json`
  );

  if (!response.ok) {
    throw new Error(`Failed to download dataset: ${response.status}`);
  }

  return response.json();
}

// ─── Parsing Helpers ────────────────────────────────────────────────────────

function parseCaption(caption: string): { name: string; description: string } {
  if (!caption || caption.trim() === "") {
    return { name: "Untitled Product", description: "" };
  }

  const lines = caption.split("\n").filter((l) => l.trim() !== "");
  let name = lines[0] || "Untitled Product";
  name = name.replace(/#\w+/g, "").trim();

  if (name.length > 100) name = name.substring(0, 97) + "...";
  if (!name) name = "Untitled Product";

  const descLines = lines.slice(1).filter((line) => {
    const lower = line.toLowerCase();
    if (lower.startsWith("#")) return false;
    if (lower.includes("dm for") || lower.includes("dm us")) return false;
    if (lower.includes("order now") || lower.includes("link in bio")) return false;
    return true;
  });

  return { name, description: descLines.join("\n").trim() };
}

function generateSlug(name: string, shortCode: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50)
    .replace(/^-|-$/g, "");

  return base ? `${base}-${shortCode}` : shortCode;
}

const CATEGORY_MAP: Record<string, string> = {
  keychain: "keychains",
  keychains: "keychains",
  photoframe: "photo-gifts",
  photoalbum: "photo-gifts",
  album: "photo-gifts",
  frame: "photo-gifts",
  photo: "photo-gifts",
  photogift: "photo-gifts",
  magnet: "small-gifts",
  bookmark: "small-gifts",
  coaster: "small-gifts",
  gift: "customised-gifts",
  customised: "customised-gifts",
  custom: "customised-gifts",
  personalized: "customised-gifts",
  personalised: "customised-gifts",
  hamper: "combos",
  combo: "combos",
  box: "combos",
};

function mapHashtagsToCategory(hashtags: string[], caption: string): string {
  // Check hashtags first
  for (const tag of hashtags) {
    const lower = tag.toLowerCase().replace("#", "");
    if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];
  }

  // Check caption keywords
  const captionLower = caption.toLowerCase();
  if (captionLower.includes("keychain")) return "keychains";
  if (captionLower.includes("album") || captionLower.includes("frame") || captionLower.includes("photo")) return "photo-gifts";
  if (captionLower.includes("magnet") || captionLower.includes("bookmark")) return "small-gifts";
  if (captionLower.includes("combo") || captionLower.includes("hamper")) return "combos";

  return "customised-gifts";
}

function getImageUrls(post: InstagramPost): string[] {
  const urls: string[] = [];

  // Main display URL
  if (post.displayUrl) urls.push(post.displayUrl);

  // Child posts (carousel/sidecar)
  if (post.childPosts && Array.isArray(post.childPosts)) {
    for (const child of post.childPosts) {
      if (child.displayUrl && !urls.includes(child.displayUrl)) {
        urls.push(child.displayUrl);
      }
    }
  }

  // Images array
  if (post.images && Array.isArray(post.images)) {
    for (const img of post.images) {
      if (img && !urls.includes(img)) {
        urls.push(img);
      }
    }
  }

  return urls;
}

// Generate a random price between 149 and 799 (rounded to nearest 49)
function generatePrice(): string {
  const base = Math.floor(Math.random() * 14) + 3; // 3-16
  return (base * 50 - 1).toString(); // 149, 199, 249...799
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  // Ensure data dir exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Step 1: Scrape Instagram
  const runResponse = await startScraper();
  const runId = runResponse.data.id;
  console.log(`   Run ID: ${runId}`);

  const datasetId = await waitForCompletion(runId);
  console.log(`✅ Dataset ready: ${datasetId}`);

  const posts = await downloadDataset(datasetId);
  console.log(`📦 Downloaded ${posts.length} posts\n`);

  // Save raw data for reference
  fs.writeFileSync(
    path.join(DATA_DIR, "instagram-raw.json"),
    JSON.stringify(posts, null, 2)
  );

  // Filter to image posts only (skip videos)
  const imagePosts = posts.filter(
    (p) => p.type !== "Video" && (p.displayUrl || (p.images && p.images.length > 0))
  );
  console.log(`📸 ${imagePosts.length} image posts to seed\n`);

  // Step 2: Connect to DB and seed
  const sql = neon(DATABASE_URL!);
  const db = drizzle(sql, { schema });
  console.log("🗄️  Connected to database");

  // Fetch existing categories
  const existingCategories = await db.select().from(schema.categories);
  const categoryIds: Record<string, string> = {};
  for (const cat of existingCategories) {
    categoryIds[cat.slug] = cat.id;
  }
  console.log(`   Found ${existingCategories.length} categories\n`);

  // Step 3: Insert products
  console.log("📝 Inserting products...\n");
  let insertCount = 0;
  let skipCount = 0;

  for (let i = 0; i < imagePosts.length; i++) {
    const post = imagePosts[i];
    const imageUrls = getImageUrls(post);

    if (imageUrls.length === 0) {
      skipCount++;
      continue;
    }

    const { name, description } = parseCaption(post.caption || "");
    const slug = generateSlug(name, post.shortCode);
    const categorySlug = mapHashtagsToCategory(
      post.hashtags || [],
      post.caption || ""
    );
    const categoryId = categoryIds[categorySlug] || categoryIds["customised-gifts"];

    if (!categoryId) {
      skipCount++;
      continue;
    }

    try {
      const [product] = await db
        .insert(schema.products)
        .values({
          name,
          slug,
          description,
          price: generatePrice(),
          categoryId,
          status: "published",
          instagramPostId: post.shortCode,
        })
        .onConflictDoNothing()
        .returning({ id: schema.products.id });

      if (!product) {
        skipCount++;
        continue;
      }

      // Insert images
      for (let j = 0; j < Math.min(imageUrls.length, 5); j++) {
        await db.insert(schema.productImages).values({
          productId: product.id,
          url: imageUrls[j],
          altText: name,
          position: j,
          isPrimary: j === 0,
        });
      }

      insertCount++;
    } catch (error: any) {
      if (error.message?.includes("duplicate")) {
        skipCount++;
      } else {
        console.error(`\n  Error on ${slug}:`, error.message);
        skipCount++;
      }
    }

    process.stdout.write(
      `\r   [${i + 1}/${imagePosts.length}] Inserted: ${insertCount} | Skipped: ${skipCount}`
    );
  }

  console.log(`\n\n${"─".repeat(50)}`);
  console.log(`✅ Seeding Complete!`);
  console.log(`   Products inserted: ${insertCount}`);
  console.log(`   Skipped: ${skipCount}`);
  console.log(`   All products are PUBLISHED with generated prices.`);
  console.log(`   View at: http://localhost:3000/shop`);
  console.log(`${"─".repeat(50)}\n`);
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});
