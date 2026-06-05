import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { z } from "zod";

const eventSchema = z.object({
  sessionId: z.string().min(1),
  eventType: z.enum([
    "page_view",
    "product_view",
    "add_to_cart",
    "remove_from_cart",
    "checkout_start",
    "checkout_complete",
    "search",
    "category_view",
    "wishlist_add",
    "remind_me",
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
  page: z.string().optional(),
  referrer: z.string().optional(),
});

/**
 * POST /api/events — Track a client-side event (anonymous, no auth required)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = eventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid event data" }, { status: 400 });
    }

    const { sessionId, eventType, metadata, page, referrer } = parsed.data;
    const userAgent = request.headers.get("user-agent") || undefined;

    await db.insert(events).values({
      sessionId,
      eventType,
      metadata: metadata || null,
      page: page || null,
      referrer: referrer || null,
      userAgent: userAgent || null,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Event tracking error:", error);
    // Don't fail silently — but don't block the user either
    return NextResponse.json({ ok: true }, { status: 201 });
  }
}
