import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reminders, customerProfiles, products } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/auth/middleware";
import { eq, desc, gte, and, sql } from "drizzle-orm";

/**
 * GET /api/admin/reminders — List all reminders with customer/product info
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // pending, sent, cancelled
    const upcoming = searchParams.get("upcoming"); // "7" = next 7 days

    const conditions = [];

    if (status) {
      conditions.push(eq(reminders.status, status as "pending" | "sent" | "cancelled"));
    }

    if (upcoming) {
      const daysAhead = Number(upcoming);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      conditions.push(gte(reminders.remindAt, new Date()));
      conditions.push(sql`${reminders.remindAt} <= ${futureDate}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const reminderList = await db
      .select({
        id: reminders.id,
        email: reminders.email,
        phone: reminders.phone,
        occasionLabel: reminders.occasionLabel,
        remindAt: reminders.remindAt,
        status: reminders.status,
        sentAt: reminders.sentAt,
        createdAt: reminders.createdAt,
        customerId: reminders.customerId,
        productId: reminders.productId,
      })
      .from(reminders)
      .where(whereClause)
      .orderBy(reminders.remindAt)
      .limit(100);

    // Enrich with customer names and product names
    const enriched = await Promise.all(
      reminderList.map(async (r) => {
        let customerName: string | null = null;
        let productName: string | null = null;

        if (r.customerId) {
          const [c] = await db
            .select({ name: customerProfiles.name })
            .from(customerProfiles)
            .where(eq(customerProfiles.id, r.customerId))
            .limit(1);
          customerName = c?.name || null;
        }

        if (r.productId) {
          const [p] = await db
            .select({ name: products.name })
            .from(products)
            .where(eq(products.id, r.productId))
            .limit(1);
          productName = p?.name || null;
        }

        return { ...r, customerName, productName };
      })
    );

    return NextResponse.json({ reminders: enriched });
  } catch (error) {
    console.error("Admin reminders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
