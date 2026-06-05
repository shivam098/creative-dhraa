import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/auth/middleware";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";

const couponCreateSchema = z.object({
  code: z.string().min(3).max(20).transform((v) => v.toUpperCase().replace(/\s/g, "")),
  description: z.string().optional(),
  discountType: z.enum(["percentage", "flat"]),
  discountValue: z.number().positive(),
  minOrderAmount: z.number().min(0).default(0),
  maxDiscountAmount: z.number().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

const couponUpdateSchema = couponCreateSchema.partial();

/**
 * GET /api/admin/coupons — List all coupons
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const allCoupons = await db
      .select()
      .from(coupons)
      .orderBy(desc(coupons.createdAt));

    return NextResponse.json({
      coupons: allCoupons.map((c) => ({
        ...c,
        discountValue: Number(c.discountValue),
        minOrderAmount: Number(c.minOrderAmount),
        maxDiscountAmount: c.maxDiscountAmount ? Number(c.maxDiscountAmount) : null,
      })),
    });
  } catch (error) {
    console.error("Coupons list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/coupons — Create a new coupon
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const parsed = couponCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check for duplicate code
    const existing = await db
      .select({ id: coupons.id })
      .from(coupons)
      .where(eq(coupons.code, data.code))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Coupon code "${data.code}" already exists` },
        { status: 409 }
      );
    }

    const [created] = await db
      .insert(coupons)
      .values({
        code: data.code,
        description: data.description || null,
        discountType: data.discountType,
        discountValue: data.discountValue.toFixed(2),
        minOrderAmount: data.minOrderAmount.toFixed(2),
        maxDiscountAmount: data.maxDiscountAmount?.toFixed(2) || null,
        usageLimit: data.usageLimit || null,
        isActive: data.isActive,
        startsAt: data.startsAt ? new Date(data.startsAt) : new Date(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      })
      .returning();

    return NextResponse.json({ coupon: created }, { status: 201 });
  } catch (error) {
    console.error("Coupon create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/coupons — Update a coupon (pass id in body)
 */
export async function PATCH(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "Coupon id is required" }, { status: 400 });
    }

    const parsed = couponUpdateSchema.safeParse(updateData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const setFields: Record<string, unknown> = {};

    if (data.code !== undefined) setFields.code = data.code;
    if (data.description !== undefined) setFields.description = data.description;
    if (data.discountType !== undefined) setFields.discountType = data.discountType;
    if (data.discountValue !== undefined) setFields.discountValue = data.discountValue.toFixed(2);
    if (data.minOrderAmount !== undefined) setFields.minOrderAmount = data.minOrderAmount.toFixed(2);
    if (data.maxDiscountAmount !== undefined) setFields.maxDiscountAmount = data.maxDiscountAmount.toFixed(2);
    if (data.usageLimit !== undefined) setFields.usageLimit = data.usageLimit;
    if (data.isActive !== undefined) setFields.isActive = data.isActive;
    if (data.startsAt !== undefined) setFields.startsAt = new Date(data.startsAt);
    if (data.expiresAt !== undefined) setFields.expiresAt = new Date(data.expiresAt);

    const [updated] = await db
      .update(coupons)
      .set(setFields)
      .where(eq(coupons.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    return NextResponse.json({ coupon: updated });
  } catch (error) {
    console.error("Coupon update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/coupons — Delete a coupon (pass id in body)
 */
export async function DELETE(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Coupon id is required" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(coupons)
      .where(eq(coupons.id, id))
      .returning({ id: coupons.id });

    if (!deleted) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Coupon delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
