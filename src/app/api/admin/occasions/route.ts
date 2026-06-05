import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { occasions, productOccasions, products } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/auth/middleware";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

/**
 * GET /api/admin/occasions — List all occasions
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const list = await db
      .select()
      .from(occasions)
      .orderBy(asc(occasions.sortOrder));

    return NextResponse.json({ occasions: list });
  } catch (error) {
    console.error("Admin occasions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/occasions — Create an occasion
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const schema = z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      description: z.string().optional(),
      imageUrl: z.string().url().optional(),
      sortOrder: z.number().int().min(0).optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const [occasion] = await db
      .insert(occasions)
      .values({
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();

    return NextResponse.json({ occasion }, { status: 201 });
  } catch (error) {
    console.error("Create occasion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
