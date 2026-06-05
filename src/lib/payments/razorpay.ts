import Razorpay from "razorpay";
import crypto from "crypto";

let _razorpay: Razorpay | null = null;

/**
 * Check if Razorpay is configured (keys are set)
 */
export function isRazorpayConfigured(): boolean {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function getRazorpay(): Razorpay {
  if (!_razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error(
        "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables."
      );
    }
    _razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return _razorpay;
}

export interface CreateOrderOptions {
  amount: number; // in INR (will be converted to paise)
  currency?: string;
  receipt: string; // order_number
  notes?: Record<string, string>;
}

/**
 * Create a Razorpay order (or mock order if not configured)
 */
export async function createRazorpayOrder(options: CreateOrderOptions) {
  // Mock mode — return a fake order object
  if (!isRazorpayConfigured()) {
    return {
      id: `mock_order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      amount: Math.round(options.amount * 100),
      currency: options.currency || "INR",
      receipt: options.receipt,
      status: "created",
    };
  }

  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: Math.round(options.amount * 100), // Convert INR to paise
    currency: options.currency || "INR",
    receipt: options.receipt,
    notes: options.notes || {},
  });

  return order;
}

/**
 * Verify Razorpay payment signature (webhook or client-side)
 * In mock mode, accepts any signature.
 */
export function verifyPaymentSignature(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): boolean {
  // Mock mode — accept any signature if keys aren't set
  if (!isRazorpayConfigured()) {
    return true;
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("RAZORPAY_KEY_SECRET is not set.");

  const body = `${params.razorpay_order_id}|${params.razorpay_payment_id}`;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return expectedSignature === params.razorpay_signature;
}

/**
 * Verify Razorpay webhook signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not set.");

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}

export { getRazorpay as razorpay };
