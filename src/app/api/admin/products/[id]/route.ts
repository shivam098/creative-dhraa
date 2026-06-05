import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/auth/middleware";
import { productUpdateSchema } from "@/lib/utils/validators";
import { eq } from "drizzle-orm";

/**
 * PATCH /api/admin/products/[id] — Update a single product
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const body = await request.json();

    const parsed = productUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price.toFixed(2);
    if (data.comparePrice !== undefined) updateData.comparePrice = data.comparePrice.toFixed(2);
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.badge !== undefined) updateData.badge = data.badge;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.customFields !== undefined) updateData.customFields = data.customFields;
    if (data.minImages !== undefined) updateData.minImages = data.minImages;
    if (data.maxImages !== undefined) updateData.maxImages = data.maxImages;

    const [updated] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product: updated });
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
