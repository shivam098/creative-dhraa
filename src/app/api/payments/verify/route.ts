import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { verifyPaymentSignature } from "@/lib/payments/razorpay";
import { paymentVerifySchema } from "@/lib/utils/validators";
import { eq } from "drizzle-orm";

/**
 * POST /api/payments/verify
 * Called by frontend after successful Razorpay checkout
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = paymentVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payment data" },
        { status: 400 }
      );
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = parsed.data;

    // Verify signature
    const isValid = verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 }
      );
    }

    // Update order status
    await db
      .update(orders)
      .set({
        paymentStatus: "paid",
        status: "processing",
        paymentId: razorpay_payment_id,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // Fetch updated order
    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        total: orders.total,
      })
      .from(orders)
      .where(eq(orders.id, orderId));

    // TODO: Send confirmation email via Resend

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: Number(order.total),
      },
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
