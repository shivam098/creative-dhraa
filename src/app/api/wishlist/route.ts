import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromCookie } from "@/lib/auth/customer-auth";
import { getDb } from "@/lib/db";
import { wishlists, products, productImages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// Get customer's wishlist
export async function GET() {
  try {
    const payload = await getCustomerFromCookie();
    if (!payload) {
      return NextResponse.json({ items: [] });
    }

    const db = getDb();
    const items = await db.query.wishlists.findMany({
      where: eq(wishlists.customerId, payload.sub),
      with: {
        product: {
          with: {
            images: true,
          },
        },
      },
      orderBy: (w, { desc }) => [desc(w.createdAt)],
    });

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        createdAt: item.createdAt,
        product: item.product
          ? {
              id: item.product.id,
              name: item.product.name,
              slug: item.product.slug,
              price: item.product.price,
              comparePrice: item.product.comparePrice,
              image: item.product.images?.find((img) => img.isPrimary)?.url ||
                item.product.images?.[0]?.url || null,
            }
          : null,
      })),
    });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

// Add to wishlist
export async function POST(req: NextRequest) {
  try {
    const payload = await getCustomerFromCookie();
    if (!payload) {
      return NextResponse.json({ error: "Please sign in to use wishlist" }, { status: 401 });
    }

    const { productId } = await req.json();
    if (!productId) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    const db = getDb();

    // Check if already in wishlist
    const existing = await db.query.wishlists.findFirst({
      where: and(
        eq(wishlists.customerId, payload.sub),
        eq(wishlists.productId, productId)
      ),
    });

    if (existing) {
      return NextResponse.json({ success: true, action: "already_exists" });
    }

    await db.insert(wishlists).values({
      customerId: payload.sub,
      productId,
    });

    return NextResponse.json({ success: true, action: "added" });
  } catch {
    return NextResponse.json({ error: "Failed to add to wishlist" }, { status: 500 });
  }
}

// Remove from wishlist
export async function DELETE(req: NextRequest) {
  try {
    const payload = await getCustomerFromCookie();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId } = await req.json();
    if (!productId) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    const db = getDb();
    await db
      .delete(wishlists)
      .where(
        and(
          eq(wishlists.customerId, payload.sub),
          eq(wishlists.productId, productId)
        )
      );

    return NextResponse.json({ success: true, action: "removed" });
  } catch {
    return NextResponse.json({ error: "Failed to remove from wishlist" }, { status: 500 });
  }
}
