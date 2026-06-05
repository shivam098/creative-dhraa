/**
 * Creative Dhraa — Seed database from scraped Instagram data
 *
 * Reads the already-downloaded instagram-raw.json and seeds the DB.
 * Handles the Apify profile scraper format where posts are nested
 * under [0].latestPosts.
 *
 * Usage: npx tsx scripts/seed/seed-from-scraped.ts
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../../src/lib/db/schema";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
const DATA_DIR = path.resolve(__dirname, "data");
const RAW_FILE = path.join(DATA_DIR, "instagram-raw.json");

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not set in .env");
  process.exit(1);
}

if (!fs.existsSync(RAW_FILE)) {
  console.error("ERROR: instagram-raw.json not found. Run scrape-and-seed.ts first.");
  process.exit(1);
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface InstagramPost {
  id: string;
  type: string;
  shortCode: string;
  caption: string;
  hashtags: string[];
  url: string;
  displayUrl: string;
  images?: string[];
  childPosts?: Array<{ displayUrl?: string; type?: string }>;
  timestamp: string;
  likesCount: number;
  commentsCount: number;
}

interface ProfileData {
  username: string;
  fullName: string;
  postsCount: number;
  latestPosts: InstagramPost[];
}

// ─── Parsing Helpers ────────────────────────────────────────────────────────

function parseCaption(caption: string): { name: string; description: string } {
  if (!caption || caption.trim() === "") {
    return { name: "Untitled Product", description: "" };
  }

  const lines = caption.split("\n").filter((l) => l.trim() !== "");
  let name = lines[0] || "Untitled Product";

  // Remove hashtags and mentions from name
  name = name.replace(/#\w+/g, "").replace(/@\w+/g, "").trim();

  if (name.length > 100) name = name.substring(0, 97) + "...";
  if (!name || name.length < 3) name = "Creative Dhraa Gift";

  const descLines = lines.slice(1).filter((line) => {
    const lower = line.toLowerCase();
    if (lower.startsWith("#")) return false;
    if (line.trim().startsWith(".")) return false; // skip "." separator lines
    if (lower.includes("dm to") || lower.includes("dm for") || lower.includes("dm us")) return false;
    if (lower.includes("order now") || lower.includes("link in bio")) return false;
    if (lower.includes("creative dhraa,")) return false; // skip keyword spam
    return true;
  });

  return { name, description: descLines.join(" ").trim().substring(0, 500) };
}

function generateSlug(name: string, shortCode: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 40)
    .replace(/^-|-$/g, "");

  return base ? `${base}-${shortCode}` : `product-${shortCode}`;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  keychains: ["keychain", "keychains", "key chain", "key ring"],
  "photo-gifts": ["photo", "album", "frame", "magazine", "collage", "print", "canvas", "poster"],
  "small-gifts": ["magnet", "bookmark", "coaster", "fridge", "badge", "pin"],
  combos: ["combo", "hamper", "box", "package", "set", "bundle"],
  "customised-gifts": ["custom", "customised", "customized", "personalized", "personalised", "gift", "resin"],
};

function mapToCategory(hashtags: string[], caption: string): string {
  const combined = [...hashtags.map(h => h.toLowerCase()), caption.toLowerCase()].join(" ");

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (combined.includes(keyword)) return category;
    }
  }

  return "customised-gifts";
}

// Generate realistic prices (INR)
function generatePrice(category: string): string {
  const priceRanges: Record<string, [number, number]> = {
    keychains: [199, 499],
    "photo-gifts": [399, 999],
    "small-gifts": [149, 349],
    combos: [699, 1499],
    "customised-gifts": [299, 799],
  };

  const [min, max] = priceRanges[category] || [249, 699];
  const price = Math.round((Math.random() * (max - min) + min) / 50) * 50 - 1;
  return price.toString();
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  // Load raw data
  const rawData = JSON.parse(fs.readFileSync(RAW_FILE, "utf-8"));

  // Extract posts — Apify profile scraper returns array of profile objects
  let posts: InstagramPost[] = [];

  if (Array.isArray(rawData)) {
    if (rawData.length > 0 && rawData[0].latestPosts) {
      // Profile scraper format: [{...profile, latestPosts: [...]}]
      posts = rawData[0].latestPosts;
      console.log(`Profile: @${rawData[0].username} (${rawData[0].postsCount} total posts)`);
    } else if (rawData.length > 0 && rawData[0].shortCode) {
      // Direct posts format
      posts = rawData;
    }
  }

  console.log(`Found ${posts.length} posts in scraped data`);

  // Use ALL posts that have a displayUrl (includes video thumbnails)
  const usablePosts = posts.filter((p) => p.displayUrl);
  console.log(`${usablePosts.length} posts have usable images\n`);

  if (usablePosts.length === 0) {
    console.error("No usable posts found!");
    process.exit(1);
  }

  // Connect to DB
  const sql = neon(DATABASE_URL!);
  const db = drizzle(sql, { schema });
  console.log("Connected to database");

  // Fetch categories
  const existingCategories = await db.select().from(schema.categories);
  const categoryIds: Record<string, string> = {};
  for (const cat of existingCategories) {
    categoryIds[cat.slug] = cat.id;
  }
  console.log(`Found ${existingCategories.length} categories\n`);

  // Insert products
  console.log("Inserting products...\n");
  let insertCount = 0;
  let skipCount = 0;

  for (let i = 0; i < usablePosts.length; i++) {
    const post = usablePosts[i];
    const { name, description } = parseCaption(post.caption || "");
    const slug = generateSlug(name, post.shortCode);
    const categorySlug = mapToCategory(post.hashtags || [], post.caption || "");
    const categoryId = categoryIds[categorySlug] || categoryIds["customised-gifts"];

    if (!categoryId) {
      skipCount++;
      continue;
    }

    // Collect image URLs
    const imageUrls: string[] = [post.displayUrl];
    if (post.childPosts) {
      for (const child of post.childPosts) {
        if (child.displayUrl && child.displayUrl !== post.displayUrl) {
          imageUrls.push(child.displayUrl);
        }
      }
    }

    try {
      const [product] = await db
        .insert(schema.products)
        .values({
          name,
          slug,
          description: description || `Beautiful ${name} - handcrafted with love by Creative Dhraa`,
          price: generatePrice(categorySlug),
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

      // Insert images (max 5)
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
      skipCount++;
    }

    process.stdout.write(
      `\r   [${i + 1}/${usablePosts.length}] Inserted: ${insertCount} | Skipped: ${skipCount}`
    );
  }

  console.log(`\n\n${"─".repeat(50)}`);
  console.log(`Done! Inserted ${insertCount} products.`);
  console.log(`Skipped: ${skipCount}`);
  console.log(`View at: http://localhost:3000/shop`);
  console.log(`${"─".repeat(50)}\n`);
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
