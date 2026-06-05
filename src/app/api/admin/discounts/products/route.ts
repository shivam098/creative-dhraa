import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productDiscounts, products } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/auth/middleware";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const productDiscountSchema = z.object({
  productId: z.string().uuid(),
  discountType: z.enum(["percentage", "flat"]),
  discountValue: z.number().positive(),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

/**
 * GET /api/admin/discounts/products — List all product-level discounts
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const discounts = await db
      .select({
        id: productDiscounts.id,
        productId: productDiscounts.productId,
        productName: products.name,
        discountType: productDiscounts.discountType,
        discountValue: productDiscounts.discountValue,
        isActive: productDiscounts.isActive,
        startsAt: productDiscounts.startsAt,
        expiresAt: productDiscounts.expiresAt,
        createdAt: productDiscounts.createdAt,
      })
      .from(productDiscounts)
      .innerJoin(products, eq(productDiscounts.productId, products.id))
      .orderBy(desc(productDiscounts.createdAt));

    return NextResponse.json({
      discounts: discounts.map((d) => ({
        ...d,
        discountValue: Number(d.discountValue),
      })),
    });
  } catch (error) {
    console.error("Product discounts list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/discounts/products — Create a product discount
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const parsed = productDiscountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const [created] = await db
      .insert(productDiscounts)
      .values({
        productId: data.productId,
        discountType: data.discountType,
        discountValue: data.discountValue.toFixed(2),
        isActive: data.isActive,
        startsAt: data.startsAt ? new Date(data.startsAt) : new Date(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      })
      .returning();

    return NextResponse.json({ discount: created }, { status: 201 });
  } catch (error) {
    console.error("Product discount create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/discounts/products — Delete a product discount
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
      .delete(productDiscounts)
      .where(eq(productDiscounts.id, id))
      .returning({ id: productDiscounts.id });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Product discount delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
