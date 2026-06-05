import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, customerUploads, products, coupons } from "@/lib/db/schema";
import { checkoutSchema, generateOrderNumber } from "@/lib/utils/validators";
import { createRazorpayOrder, isRazorpayConfigured } from "@/lib/payments/razorpay";
import { eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid checkout data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const couponCode: string | undefined = body.couponCode;
    const clientDiscountAmount: number | undefined = body.discountAmount;

    // Verify all products exist and prices match
    const productIds = data.items.map((item) => item.productId);
    const dbProducts = await db
      .select({ id: products.id, price: products.price, name: products.name })
      .from(products)
      .where(eq(products.status, "published"));

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    for (const item of data.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found or unavailable` },
          { status: 400 }
        );
      }
      if (product.price && Number(product.price) !== item.unitPrice) {
        return NextResponse.json(
          { error: `Price mismatch for ${product.name}. Please refresh cart.` },
          { status: 409 }
        );
      }
    }

    // Calculate totals
    const subtotal = data.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const shippingCost = subtotal >= 499 ? 0 : 49; // Free shipping over ₹499

    // Validate coupon server-side if provided
    let discountAmount = 0;
    if (couponCode && clientDiscountAmount) {
      const [coupon] = await db
        .select()
        .from(coupons)
        .where(eq(coupons.code, couponCode.toUpperCase()))
        .limit(1);

      if (coupon && coupon.isActive) {
        // Recalculate discount server-side for security
        if (coupon.discountType === "percentage") {
          discountAmount = (subtotal * Number(coupon.discountValue)) / 100;
          const maxCap = coupon.maxDiscountAmount ? Number(coupon.maxDiscountAmount) : Infinity;
          discountAmount = Math.min(discountAmount, maxCap);
        } else {
          discountAmount = Number(coupon.discountValue);
        }
        discountAmount = Math.min(Math.round(discountAmount), subtotal);

        // Increment coupon usage
        await db
          .update(coupons)
          .set({ usageCount: sql`${coupons.usageCount} + 1` })
          .where(eq(coupons.id, coupon.id));
      }
    }

    const total = subtotal + shippingCost - discountAmount;

    const orderNumber = generateOrderNumber();
    const testMode = !isRazorpayConfigured();

    // Create Razorpay order (returns mock data if not configured)
    const razorpayOrder = await createRazorpayOrder({
      amount: total,
      receipt: orderNumber,
    });

    // Create order in database
    const [order] = await db
      .insert(orders)
      .values({
        orderNumber,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        shippingAddress: data.shippingAddress,
        subtotal: subtotal.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        total: total.toFixed(2),
        paymentId: razorpayOrder.id,
        notes: data.notes || null,
      })
      .returning();

    // Create order items
    const orderItemsData = data.items.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      variantId: item.variantId || null,
      templateId: item.templateId || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      customization: item.customization || null,
    }));

    await db.insert(orderItems).values(orderItemsData);

    // Link any customer uploads to this order
    for (const item of data.items) {
      if (item.customization?.images) {
        for (const img of item.customization.images) {
          await db
            .update(customerUploads)
            .set({ status: "linked" })
            .where(eq(customerUploads.id, img.uploadId));
        }
      }
    }

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      razorpayOrderId: razorpayOrder.id,
      amount: total,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID || "",
      testMode,
    });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
