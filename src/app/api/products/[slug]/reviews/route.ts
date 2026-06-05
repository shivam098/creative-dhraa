import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviews, products } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const reviewSubmitSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters").max(50),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

/**
 * GET /api/products/[slug]/reviews — Get approved reviews for a product
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Find product by slug
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const productReviews = await db
      .select()
      .from(reviews)
      .where(
        and(eq(reviews.productId, product.id), eq(reviews.isApproved, true))
      )
      .orderBy(desc(reviews.createdAt));

    // Calculate average rating
    const avgRating =
      productReviews.length > 0
        ? productReviews.reduce((sum, r) => sum + r.rating, 0) /
          productReviews.length
        : 0;

    return NextResponse.json({
      reviews: productReviews,
      count: productReviews.length,
      avgRating: Math.round(avgRating * 10) / 10,
    });
  } catch (error) {
    console.error("Fetch reviews error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products/[slug]/reviews — Submit a review (goes to pending approval)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    const parsed = reviewSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Find product by slug
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const [review] = await db
      .insert(reviews)
      .values({
        productId: product.id,
        customerName: parsed.data.customerName,
        rating: parsed.data.rating,
        comment: parsed.data.comment || null,
        isApproved: false, // Requires admin approval
      })
      .returning();

    return NextResponse.json(
      {
        message: "Review submitted successfully. It will appear after approval.",
        review,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Submit review error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
