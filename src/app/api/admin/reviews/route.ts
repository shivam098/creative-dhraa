import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviews, products } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/auth/middleware";
import { desc, eq } from "drizzle-orm";

/**
 * GET /api/admin/reviews — List all reviews (pending + approved)
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // "pending" | "approved" | null (all)

    const allReviews = await db
      .select({
        id: reviews.id,
        productId: reviews.productId,
        productName: products.name,
        productSlug: products.slug,
        customerName: reviews.customerName,
        rating: reviews.rating,
        comment: reviews.comment,
        isApproved: reviews.isApproved,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .leftJoin(products, eq(reviews.productId, products.id))
      .orderBy(desc(reviews.createdAt));

    // Filter by status if specified
    let filtered = allReviews;
    if (status === "pending") {
      filtered = allReviews.filter((r) => !r.isApproved);
    } else if (status === "approved") {
      filtered = allReviews.filter((r) => r.isApproved);
    }

    return NextResponse.json({
      reviews: filtered,
      total: filtered.length,
      pendingCount: allReviews.filter((r) => !r.isApproved).length,
    });
  } catch (error) {
    console.error("Admin fetch reviews error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
