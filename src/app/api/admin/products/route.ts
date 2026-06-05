import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productImages, categories } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/auth/middleware";
import { productUpdateSchema, bulkPriceUpdateSchema } from "@/lib/utils/validators";
import { eq, desc, sql } from "drizzle-orm";

/**
 * GET /api/admin/products — List all products (including drafts)
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "20");
    const status = searchParams.get("status"); // draft, published, archived

    const conditions = [];
    if (status) {
      conditions.push(eq(products.status, status as "draft" | "published" | "archived"));
    }

    const offset = (page - 1) * limit;

    const [productList, countResult] = await Promise.all([
      db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          price: products.price,
          comparePrice: products.comparePrice,
          status: products.status,
          categoryId: products.categoryId,
          createdAt: products.createdAt,
        })
        .from(products)
        .where(conditions.length > 0 ? conditions[0] : undefined)
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(conditions.length > 0 ? conditions[0] : undefined),
    ]);

    return NextResponse.json({
      products: productList.map((p) => ({
        ...p,
        price: p.price ? Number(p.price) : null,
        comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
      })),
      pagination: {
        page,
        limit,
        total: Number(countResult[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error("Admin products error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/products — Bulk price update
 */
export async function PATCH(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const parsed = bulkPriceUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { updates } = parsed.data;
    let updated = 0;

    for (const item of updates) {
      await db
        .update(products)
        .set({
          price: item.price.toFixed(2),
          comparePrice: item.comparePrice?.toFixed(2) || null,
          updatedAt: new Date(),
        })
        .where(eq(products.id, item.productId));
      updated++;
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
