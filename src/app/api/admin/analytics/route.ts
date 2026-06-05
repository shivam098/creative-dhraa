import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, products, categories } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/auth/middleware";
import { sql, eq, gte, lte, and, desc } from "drizzle-orm";

/**
 * GET /api/admin/analytics
 * Query params: period=daily|weekly|monthly (default: daily)
 * Returns: revenue trends, order trends, top products, declining products
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "daily") as "daily" | "weekly" | "monthly";

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate date ranges based on period
    let currentStart: Date;
    let previousStart: Date;
    let previousEnd: Date;
    let dateExpr: ReturnType<typeof sql>;

    if (period === "daily") {
      // Last 30 days vs prior 30 days
      currentStart = new Date(today);
      currentStart.setDate(currentStart.getDate() - 30);
      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - 30);
      dateExpr = sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`;
    } else if (period === "weekly") {
      // Last 12 weeks vs prior 12 weeks
      currentStart = new Date(today);
      currentStart.setDate(currentStart.getDate() - 84); // 12 weeks
      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - 84);
      dateExpr = sql`to_char(${orders.createdAt}, 'IYYY-IW')`;
    } else {
      // Last 12 months vs prior 12 months
      currentStart = new Date(today);
      currentStart.setMonth(currentStart.getMonth() - 12);
      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd);
      previousStart.setMonth(previousStart.getMonth() - 12);
      dateExpr = sql`to_char(${orders.createdAt}, 'YYYY-MM')`;
    }

    // 1. Revenue & order count trends for current period
    // Count ALL orders (not just paid) for order count, sum total for revenue
    const revenueTrend = await db
      .select({
        date: dateExpr.as("date"),
        revenue: sql<number>`COALESCE(SUM(${orders.total}::numeric), 0)`.as("revenue"),
        orderCount: sql<number>`COUNT(*)`.as("order_count"),
      })
      .from(orders)
      .where(gte(orders.createdAt, currentStart))
      .groupBy(dateExpr)
      .orderBy(dateExpr);

    // 2. Summary stats: current period vs previous period
    const [currentStats] = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${orders.total}::numeric), 0)`.as("total_revenue"),
        paidRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'paid' THEN ${orders.total}::numeric ELSE 0 END), 0)`.as("paid_revenue"),
        totalOrders: sql<number>`COUNT(*)`.as("total_orders"),
        avgOrderValue: sql<number>`COALESCE(AVG(${orders.total}::numeric), 0)`.as("avg_order_value"),
      })
      .from(orders)
      .where(gte(orders.createdAt, currentStart));

    const [previousStats] = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${orders.total}::numeric), 0)`.as("total_revenue"),
        totalOrders: sql<number>`COUNT(*)`.as("total_orders"),
        avgOrderValue: sql<number>`COALESCE(AVG(${orders.total}::numeric), 0)`.as("avg_order_value"),
      })
      .from(orders)
      .where(and(gte(orders.createdAt, previousStart), lte(orders.createdAt, previousEnd)));

    // 3. Top selling products (by quantity in current period)
    const topProducts = await db
      .select({
        productId: orderItems.productId,
        productName: products.name,
        categoryName: categories.name,
        totalQuantity: sql<number>`SUM(${orderItems.quantity})`.as("total_quantity"),
        totalRevenue: sql<number>`SUM(${orderItems.unitPrice}::numeric * ${orderItems.quantity})`.as("total_revenue"),
        orderCount: sql<number>`COUNT(DISTINCT ${orderItems.orderId})`.as("order_count"),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(gte(orders.createdAt, currentStart))
      .groupBy(orderItems.productId, products.name, categories.name)
      .orderBy(desc(sql`SUM(${orderItems.quantity})`))
      .limit(10);

    // 4. Declining products (sold less this period vs previous period)
    const currentProductSales = await db
      .select({
        productId: orderItems.productId,
        productName: products.name,
        totalQuantity: sql<number>`SUM(${orderItems.quantity})`.as("total_quantity"),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(gte(orders.createdAt, currentStart))
      .groupBy(orderItems.productId, products.name);

    const previousProductSales = await db
      .select({
        productId: orderItems.productId,
        productName: products.name,
        totalQuantity: sql<number>`SUM(${orderItems.quantity})`.as("total_quantity"),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(and(gte(orders.createdAt, previousStart), lte(orders.createdAt, previousEnd)))
      .groupBy(orderItems.productId, products.name);

    // Calculate declining products
    const previousMap = new Map(
      previousProductSales.map((p) => [p.productId, Number(p.totalQuantity)])
    );

    const decliningProducts = currentProductSales
      .map((current) => {
        const prevQty = previousMap.get(current.productId) || 0;
        const currentQty = Number(current.totalQuantity);
        const change = prevQty > 0 ? ((currentQty - prevQty) / prevQty) * 100 : 0;
        return {
          productId: current.productId,
          productName: current.productName,
          currentQuantity: currentQty,
          previousQuantity: prevQty,
          changePercent: Math.round(change),
        };
      })
      .filter((p) => p.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 10);

    // Also include products that had sales in previous period but zero now
    const currentProductIds = new Set(currentProductSales.map((p) => p.productId));
    const lostProducts = previousProductSales
      .filter((p) => !currentProductIds.has(p.productId))
      .map((p) => ({
        productId: p.productId,
        productName: p.productName,
        currentQuantity: 0,
        previousQuantity: Number(p.totalQuantity),
        changePercent: -100,
      }));

    const allDeclining = [...lostProducts, ...decliningProducts]
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 10);

    // 5. Category breakdown
    const categoryBreakdown = await db
      .select({
        categoryName: categories.name,
        totalRevenue: sql<number>`SUM(${orderItems.unitPrice}::numeric * ${orderItems.quantity})`.as("total_revenue"),
        totalQuantity: sql<number>`SUM(${orderItems.quantity})`.as("total_quantity"),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(gte(orders.createdAt, currentStart))
      .groupBy(categories.name)
      .orderBy(desc(sql`SUM(${orderItems.unitPrice}::numeric * ${orderItems.quantity})`));

    // Calculate percentage changes
    const revenueChange =
      Number(previousStats.totalRevenue) > 0
        ? ((Number(currentStats.totalRevenue) - Number(previousStats.totalRevenue)) /
            Number(previousStats.totalRevenue)) *
          100
        : Number(currentStats.totalRevenue) > 0 ? 100 : 0;

    const ordersChange =
      Number(previousStats.totalOrders) > 0
        ? ((Number(currentStats.totalOrders) - Number(previousStats.totalOrders)) /
            Number(previousStats.totalOrders)) *
          100
        : Number(currentStats.totalOrders) > 0 ? 100 : 0;

    return NextResponse.json({
      period,
      summary: {
        totalRevenue: Number(currentStats.totalRevenue),
        paidRevenue: Number(currentStats.paidRevenue),
        totalOrders: Number(currentStats.totalOrders),
        avgOrderValue: Number(Number(currentStats.avgOrderValue).toFixed(0)),
        revenueChange: Math.round(revenueChange),
        ordersChange: Math.round(ordersChange),
        previousRevenue: Number(previousStats.totalRevenue),
        previousOrders: Number(previousStats.totalOrders),
      },
      revenueTrend: revenueTrend.map((r) => ({
        date: r.date,
        revenue: Number(r.revenue),
        orders: Number(r.orderCount),
      })),
      topProducts: topProducts.map((p) => ({
        ...p,
        totalQuantity: Number(p.totalQuantity),
        totalRevenue: Number(p.totalRevenue),
        orderCount: Number(p.orderCount),
      })),
      decliningProducts: allDeclining,
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c.categoryName || "Uncategorized",
        revenue: Number(c.totalRevenue),
        quantity: Number(c.totalQuantity),
      })),
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
