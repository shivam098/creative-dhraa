/**
 * Seed script: Create initial admin user
 * Run with: npx tsx scripts/seed/create-admin.ts
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import bcrypt from "bcryptjs";
import * as schema from "../../src/lib/db/schema";
import "dotenv/config";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not set in .env");
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  const email = "admin@creativedhraa.in";
  const password = "admin123"; // Change this after first login!
  const name = "Admin";

  const passwordHash = await bcrypt.hash(password, 12);

  // Check if admin already exists
  const existing = await db
    .select()
    .from(schema.adminUsers)
    .where(
      require("drizzle-orm").eq(schema.adminUsers.email, email)
    );

  if (existing.length > 0) {
    console.log(`Admin user already exists: ${email}`);
    process.exit(0);
  }

  await db.insert(schema.adminUsers).values({
    email,
    passwordHash,
    name,
  });

  console.log("Admin user created successfully!");
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${password}`);
  console.log("  ⚠️  Change the password after first login!");

  // Also seed default categories
  const defaultCategories = [
    { name: "Keychains", slug: "keychains", description: "Custom keychains with photos and text" },
    { name: "Photo Gifts", slug: "photo-gifts", description: "Personalized photo albums, frames, and prints" },
    { name: "Small Gifts", slug: "small-gifts", description: "Compact personalized gifts for any occasion" },
    { name: "Customised Gifts", slug: "customised-gifts", description: "Fully customizable gifts made to order" },
    { name: "Combos", slug: "combos", description: "Gift bundles and combo packs" },
  ];

  const existingCategories = await db.select().from(schema.categories);
  if (existingCategories.length === 0) {
    await db.insert(schema.categories).values(defaultCategories);
    console.log("\nDefault categories seeded:");
    defaultCategories.forEach((c) => console.log(`  - ${c.name}`));
  } else {
    console.log("\nCategories already exist, skipping.");
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
