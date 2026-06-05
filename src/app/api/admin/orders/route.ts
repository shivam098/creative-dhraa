import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, products } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/auth/middleware";
import { desc, eq, sql } from "drizzle-orm";

/**
 * GET /api/admin/orders — List all orders
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "20");
    const status = searchParams.get("status");

    const conditions = [];
    if (status) {
      conditions.push(eq(orders.status, status as "pending" | "processing" | "shipped" | "delivered" | "cancelled"));
    }

    const offset = (page - 1) * limit;

    const [orderList, countResult] = await Promise.all([
      db
        .select()
        .from(orders)
        .where(conditions.length > 0 ? conditions[0] : undefined)
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(conditions.length > 0 ? conditions[0] : undefined),
    ]);

    return NextResponse.json({
      orders: orderList.map((o) => ({
        ...o,
        subtotal: Number(o.subtotal),
        shippingCost: Number(o.shippingCost),
        total: Number(o.total),
        discountAmount: Number(o.discountAmount),
      })),
      pagination: {
        page,
        limit,
        total: Number(countResult[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error("Admin orders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
