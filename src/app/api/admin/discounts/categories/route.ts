import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categoryDiscounts, categories } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/auth/middleware";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const categoryDiscountSchema = z.object({
  categoryId: z.string().uuid(),
  discountType: z.enum(["percentage", "flat"]),
  discountValue: z.number().positive(),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

/**
 * GET /api/admin/discounts/categories — List all category-level discounts
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const discounts = await db
      .select({
        id: categoryDiscounts.id,
        categoryId: categoryDiscounts.categoryId,
        categoryName: categories.name,
        discountType: categoryDiscounts.discountType,
        discountValue: categoryDiscounts.discountValue,
        isActive: categoryDiscounts.isActive,
        startsAt: categoryDiscounts.startsAt,
        expiresAt: categoryDiscounts.expiresAt,
        createdAt: categoryDiscounts.createdAt,
      })
      .from(categoryDiscounts)
      .innerJoin(categories, eq(categoryDiscounts.categoryId, categories.id))
      .orderBy(desc(categoryDiscounts.createdAt));

    return NextResponse.json({
      discounts: discounts.map((d) => ({
        ...d,
        discountValue: Number(d.discountValue),
      })),
    });
  } catch (error) {
    console.error("Category discounts list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/discounts/categories — Create a category discount
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const parsed = categoryDiscountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const [created] = await db
      .insert(categoryDiscounts)
      .values({
        categoryId: data.categoryId,
        discountType: data.discountType,
        discountValue: data.discountValue.toFixed(2),
        isActive: data.isActive,
        startsAt: data.startsAt ? new Date(data.startsAt) : new Date(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      })
      .returning();

    return NextResponse.json({ discount: created }, { status: 201 });
  } catch (error) {
    console.error("Category discount create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/discounts/categories — Delete a category discount
 */
export async function DELETE(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Discount id required" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(categoryDiscounts)
      .where(eq(categoryDiscounts.id, id))
      .returning({ id: categoryDiscounts.id });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Category discount delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
