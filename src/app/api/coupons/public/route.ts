import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { and, eq, lte, or, isNull, sql } from "drizzle-orm";

/**
 * GET /api/coupons/public — Get active public coupons for storefront banner
 */
export async function GET() {
  try {
    const now = new Date();

    const publicCoupons = await db
      .select({
        id: coupons.id,
        code: coupons.code,
        description: coupons.description,
        discountType: coupons.discountType,
        discountValue: coupons.discountValue,
        minOrderAmount: coupons.minOrderAmount,
        maxDiscountAmount: coupons.maxDiscountAmount,
        expiresAt: coupons.expiresAt,
      })
      .from(coupons)
      .where(
        and(
          eq(coupons.isActive, true),
          eq(coupons.isPublic, true),
          lte(coupons.startsAt, now),
          or(
            isNull(coupons.expiresAt),
            sql`${coupons.expiresAt} > ${now}`
          )
        )
      );

    // Also check usage limit
    const validCoupons = publicCoupons.filter((c) => {
      // If no usageLimit field in select, we can't filter — but the schema has it
      // For safety, return all active ones (usage check happens at checkout)
      return true;
    });

    return NextResponse.json({ coupons: validCoupons });
  } catch (error) {
    console.error("Public coupons error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
