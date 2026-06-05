/**
 * Creative Dhraa — Seed Database from R2 Manifest
 *
 * This script:
 * 1. Reads the R2 manifest (post data + R2 URLs)
 * 2. Parses captions to extract product names and descriptions
 * 3. Maps hashtags to categories
 * 4. Inserts products, images, and categories into Neon PostgreSQL
 * 5. All products are created as "draft" with price = null
 *
 * Usage: npx tsx scripts/seed/seed-database.ts
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../../src/lib/db/schema";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const DATA_DIR = path.resolve(__dirname, "data");
const R2_MANIFEST_FILE = path.join(DATA_DIR, "r2-manifest.json");

interface R2Manifest {
  postId: string;
  shortCode: string;
  r2Urls: string[];
  caption: string;
  hashtags: string[];
  timestamp: string;
}

// ─── Caption Parser ─────────────────────────────────────────────────────────

function parseCaption(caption: string): { name: string; description: string } {
  if (!caption || caption.trim() === "") {
    return { name: "Untitled Product", description: "" };
  }

  const lines = caption.split("\n").filter((l) => l.trim() !== "");

  // First line (before any hashtags) = product name
  let name = lines[0] || "Untitled Product";

  // Remove hashtags from name
  name = name.replace(/#\w+/g, "").trim();

  // Truncate if too long
  if (name.length > 100) {
    name = name.substring(0, 97) + "...";
  }

  // If name is empty after cleanup
  if (!name) {
    name = "Untitled Product";
  }

  // Rest = description (remove hashtag lines, DM lines, price lines)
  const descLines = lines.slice(1).filter((line) => {
    const lower = line.toLowerCase();
    if (lower.startsWith("#")) return false;
    if (lower.includes("dm for") || lower.includes("dm us")) return false;
    if (lower.includes("order now") || lower.includes("link in bio"))
      return false;
    return true;
  });

  const description = descLines.join("\n").trim();

  return { name, description };
}

// ─── Slug Generator ─────────────────────────────────────────────────────────

function generateSlug(name: string, shortCode: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50)
    .replace(/^-|-$/g, "");

  // Append shortCode to guarantee uniqueness
  return base ? `${base}-${shortCode}` : shortCode;
}

// ─── Category Mapper ────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, string> = {
  keychain: "keychains",
  keychains: "keychains",
  photoframe: "photo-gifts",
  photoalbum: "photo-gifts",
  album: "photo-gifts",
  frame: "photo-gifts",
  photo: "photo-gifts",
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

function mapHashtagsToCategory(hashtags: string[]): string {
  for (const tag of hashtags) {
    const lower = tag.toLowerCase().replace("#", "");
    if (CATEGORY_MAP[lower]) {
      return CATEGORY_MAP[lower];
    }
  }
  return "customised-gifts"; // default category
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  // Validate env
  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL not set in .env.local");
    process.exit(1);
  }

  // Check manifest
  if (!fs.existsSync(R2_MANIFEST_FILE)) {
    console.error("ERROR: R2 manifest not found. Run upload-to-r2.ts first.");
    process.exit(1);
  }

  // Connect to database
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  console.log("Connected to database\n");

  // Load manifest
  const manifest: R2Manifest[] = JSON.parse(
    fs.readFileSync(R2_MANIFEST_FILE, "utf-8")
  );
  console.log(`Processing ${manifest.length} posts...\n`);

  // Step 1: Create categories
  const categoryDefs = [
    { name: "Keychains", slug: "keychains", description: "Custom photo keychains and name keychains" },
    { name: "Photo Gifts", slug: "photo-gifts", description: "Photo albums, frames, and collages" },
    { name: "Small Gifts", slug: "small-gifts", description: "Fridge magnets, bookmarks, and coasters" },
    { name: "Customised Gifts", slug: "customised-gifts", description: "Personalized gifts for every occasion" },
    { name: "Combos", slug: "combos", description: "Gift hampers and combo boxes" },
  ];

  console.log("Creating categories...");
  const categoryIds: Record<string, string> = {};

  for (const cat of categoryDefs) {
    const result = await db
      .insert(schema.categories)
      .values(cat)
      .onConflictDoNothing()
      .returning({ id: schema.categories.id, slug: schema.categories.slug });

    if (result.length > 0) {
      categoryIds[cat.slug] = result[0].id;
      console.log(`  Created: ${cat.name}`);
    }
  }

  // If categories already existed, fetch them
  if (Object.keys(categoryIds).length === 0) {
    const existing = await db.select().from(schema.categories);
    for (const cat of existing) {
      categoryIds[cat.slug] = cat.id;
    }
    console.log(`  ${existing.length} categories already exist`);
  }

  // Step 2: Insert products
  console.log("\nInserting products...");
  let insertCount = 0;
  let skipCount = 0;

  for (let i = 0; i < manifest.length; i++) {
    const item = manifest[i];

    // Skip posts with no images
    if (item.r2Urls.length === 0) {
      skipCount++;
      continue;
    }

    const { name, description } = parseCaption(item.caption);
    const slug = generateSlug(name, item.shortCode);
    const categorySlug = mapHashtagsToCategory(item.hashtags);
    const categoryId = categoryIds[categorySlug] || categoryIds["customised-gifts"];

    try {
      // Insert product
      const [product] = await db
        .insert(schema.products)
        .values({
          name,
          slug,
          description,
          price: null, // Admin will set prices later
          categoryId,
          status: "draft",
          instagramPostId: item.shortCode,
        })
        .onConflictDoNothing()
        .returning({ id: schema.products.id });

      if (!product) {
        skipCount++;
        continue;
      }

      // Insert images
      for (let j = 0; j < item.r2Urls.length; j++) {
        await db.insert(schema.productImages).values({
          productId: product.id,
          url: item.r2Urls[j],
          altText: name,
          position: j,
          isPrimary: j === 0,
        });
      }

      insertCount++;
    } catch (error) {
      console.error(`\n  Error inserting ${slug}:`, error);
      skipCount++;
    }

    const progress = Math.round(((i + 1) / manifest.length) * 100);
    process.stdout.write(
      `\r  Progress: ${i + 1}/${manifest.length} (${progress}%) | Inserted: ${insertCount} | Skipped: ${skipCount}`
    );
  }

  console.log(`\n\n── Seeding Complete ──────────────────────────`);
  console.log(`  Products inserted: ${insertCount}`);
  console.log(`  Skipped: ${skipCount}`);
  console.log(`  All products are in DRAFT status with no price.`);
  console.log(`  Use the admin dashboard to set prices and publish.`);
}

main();
