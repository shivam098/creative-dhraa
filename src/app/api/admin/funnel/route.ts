import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/auth/middleware";
import { sql, gte, and } from "drizzle-orm";

/**
 * GET /api/admin/funnel — Funnel analytics for visitor conversion
 * Returns counts for each event stage over a given period.
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const days = Number(searchParams.get("days") || "30");
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Count unique sessions per event type
    const funnelData = await db
      .select({
        eventType: events.eventType,
        uniqueSessions: sql<number>`count(distinct ${events.sessionId})`,
        totalEvents: sql<number>`count(*)`,
      })
      .from(events)
      .where(gte(events.createdAt, since))
      .groupBy(events.eventType);

    // Build funnel stages in order
    const stageOrder = [
      "page_view",
      "product_view",
      "add_to_cart",
      "checkout_start",
      "checkout_complete",
    ];

    const funnel = stageOrder.map((stage) => {
      const match = funnelData.find((d) => d.eventType === stage);
      return {
        stage,
        label: formatStageLabel(stage),
        uniqueSessions: Number(match?.uniqueSessions || 0),
        totalEvents: Number(match?.totalEvents || 0),
      };
    });

    // Daily breakdown for the chart
    const dailyEvents = await db
      .select({
        date: sql<string>`date(${events.createdAt})`,
        eventType: events.eventType,
        count: sql<number>`count(distinct ${events.sessionId})`,
      })
      .from(events)
      .where(gte(events.createdAt, since))
      .groupBy(sql`date(${events.createdAt})`, events.eventType)
      .orderBy(sql`date(${events.createdAt})`);

    // Additional metrics
    const totalUniqueSessions = await db
      .select({ count: sql<number>`count(distinct ${events.sessionId})` })
      .from(events)
      .where(gte(events.createdAt, since));

    const searchEvents = funnelData.find((d) => d.eventType === "search");
    const remindMeEvents = funnelData.find((d) => d.eventType === "remind_me");

    return NextResponse.json({
      funnel,
      dailyBreakdown: dailyEvents.map((d) => ({
        date: d.date,
        eventType: d.eventType,
        count: Number(d.count),
      })),
      summary: {
        totalVisitors: Number(totalUniqueSessions[0]?.count || 0),
        conversionRate:
          funnel[0].uniqueSessions > 0
            ? ((funnel[4].uniqueSessions / funnel[0].uniqueSessions) * 100).toFixed(1)
            : "0",
        cartAbandonmentRate:
          funnel[2].uniqueSessions > 0
            ? (
                ((funnel[2].uniqueSessions - funnel[4].uniqueSessions) /
                  funnel[2].uniqueSessions) *
                100
              ).toFixed(1)
            : "0",
        searchCount: Number(searchEvents?.totalEvents || 0),
        remindMeCount: Number(remindMeEvents?.totalEvents || 0),
      },
      period: { days, since: since.toISOString() },
    });
  } catch (error) {
    console.error("Funnel analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function formatStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    page_view: "Visitors",
    product_view: "Product Views",
    add_to_cart: "Added to Cart",
    checkout_start: "Started Checkout",
    checkout_complete: "Completed Order",
  };
  return labels[stage] || stage;
}
