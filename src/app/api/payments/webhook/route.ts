import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { eq } from "drizzle-orm";

/**
 * POST /api/payments/webhook
 * Razorpay webhook handler — backup to client-side verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(body, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    const eventType = event.event;

    if (eventType === "payment.captured") {
      const payment = event.payload.payment.entity;
      const rzpOrderId = payment.order_id;

      // Find order by Razorpay order ID
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.paymentId, rzpOrderId));

      if (order && order.paymentStatus !== "paid") {
        await db
          .update(orders)
          .set({
            paymentStatus: "paid",
            status: "processing",
            paymentId: payment.id,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));
      }
    } else if (eventType === "payment.failed") {
      const payment = event.payload.payment.entity;
      const rzpOrderId = payment.order_id;

      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.paymentId, rzpOrderId));

      if (order) {
        await db
          .update(orders)
          .set({
            paymentStatus: "failed",
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
