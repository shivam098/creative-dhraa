import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";

const validateSchema = z.object({
  code: z.string().min(1).transform((v) => v.toUpperCase().trim()),
  subtotal: z.number().positive(),
});

/**
 * POST /api/coupons/validate — Validate and calculate a coupon discount
 * Public endpoint (no admin auth required — used at checkout)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = validateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    const { code, subtotal } = parsed.data;
    const now = new Date();

    // Find active coupon
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(
        and(
          eq(coupons.code, code),
          eq(coupons.isActive, true)
        )
      )
      .limit(1);

    if (!coupon) {
      return NextResponse.json({
        valid: false,
        error: "Invalid coupon code",
      });
    }

    // Check date validity
    if (coupon.startsAt && new Date(coupon.startsAt) > now) {
      return NextResponse.json({
        valid: false,
        error: "This coupon is not yet active",
      });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
      return NextResponse.json({
        valid: false,
        error: "This coupon has expired",
      });
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({
        valid: false,
        error: "This coupon has reached its usage limit",
      });
    }

    // Check minimum order amount
    const minAmount = Number(coupon.minOrderAmount || 0);
    if (subtotal < minAmount) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order amount is ₹${minAmount}`,
      });
    }

    // Calculate discount
    let discountAmount: number;
    if (coupon.discountType === "percentage") {
      discountAmount = (subtotal * Number(coupon.discountValue)) / 100;
      // Apply cap if set
      const maxDiscount = coupon.maxDiscountAmount ? Number(coupon.maxDiscountAmount) : Infinity;
      discountAmount = Math.min(discountAmount, maxDiscount);
    } else {
      discountAmount = Number(coupon.discountValue);
    }

    // Discount cannot exceed subtotal
    discountAmount = Math.min(discountAmount, subtotal);

    return NextResponse.json({
      valid: true,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
      },
      discountAmount: Math.round(discountAmount),
      finalTotal: Math.round(subtotal - discountAmount),
    });
  } catch (error) {
    console.error("Coupon validate error:", error);
    return NextResponse.json({ valid: false, error: "Server error" }, { status: 500 });
  }
}
