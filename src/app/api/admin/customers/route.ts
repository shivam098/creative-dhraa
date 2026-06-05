import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customerProfiles, importantDates, orders } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/auth/middleware";
import { eq, desc, sql, ilike, or } from "drizzle-orm";
import { z } from "zod";

/**
 * GET /api/admin/customers — List customer profiles with filters
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    const tag = searchParams.get("tag");
    const offset = (page - 1) * limit;

    let whereClause;

    if (search) {
      whereClause = or(
        ilike(customerProfiles.name, `%${search}%`),
        ilike(customerProfiles.email, `%${search}%`),
        ilike(customerProfiles.phone, `%${search}%`)
      );
    }

    const [profileList, countResult] = await Promise.all([
      db
        .select()
        .from(customerProfiles)
        .where(whereClause)
        .orderBy(desc(customerProfiles.lastOrderAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(customerProfiles)
        .where(whereClause),
    ]);

    // Filter by tag in application code (JSONB array contains)
    const filtered = tag
      ? profileList.filter((p) => (p.tags as string[])?.includes(tag))
      : profileList;

    return NextResponse.json({
      customers: filtered.map((c) => ({
        ...c,
        totalSpent: c.totalSpent ? Number(c.totalSpent) : 0,
      })),
      pagination: {
        page,
        limit,
        total: Number(countResult[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error("Admin customers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/customers — Manually create a customer profile
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().min(10).optional(),
      city: z.string().optional(),
      tags: z.array(z.string()).optional(),
      notes: z.string().optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const [customer] = await db
      .insert(customerProfiles)
      .values({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        city: data.city || null,
        tags: data.tags || [],
        notes: data.notes || null,
        source: "admin",
      })
      .returning();

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error("Create customer error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
