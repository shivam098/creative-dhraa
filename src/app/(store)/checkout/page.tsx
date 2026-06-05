"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/utils/validators";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  modal: { ondismiss: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// ─── Floating Label Input ─────────────────────────────────────────────────────
function FormField({
  label,
  required,
  type = "text",
  pattern,
  value,
  onChange,
  error,
  id,
  className = "",
}: {
  label: string;
  required?: boolean;
  type?: string;
  pattern?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  id: string;
  className?: string;
}) {
  const [touched, setTouched] = useState(false);
  const hasValue = value.length > 0;
  const showError = touched && error;

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        type={type}
        pattern={pattern}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={showError ? "true" : undefined}
        aria-describedby={showError ? `${id}-error` : undefined}
        className={`peer w-full rounded-lg border bg-background px-4 pt-5 pb-2 text-sm text-foreground outline-none transition-all ${
          showError
            ? "border-error focus:border-error focus:ring-1 focus:ring-error"
            : "border-border focus:border-accent focus:ring-1 focus:ring-accent"
        }`}
        placeholder=" "
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm transition-all peer-focus:top-3 peer-focus:text-xs peer-focus:-translate-y-0 ${
          hasValue ? "top-3 text-xs -translate-y-0" : ""
        } ${showError ? "text-error" : "text-muted peer-focus:text-accent"}`}
      >
        {label}{required && " *"}
      </label>
      {showError && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Validation helpers ───────────────────────────────────────────────────────
function getFieldError(field: string, value: string): string | undefined {
  if (!value.trim()) return "This field is required";
  switch (field) {
    case "customerEmail":
      return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "Enter a valid email address" : undefined;
    case "customerPhone":
      return !/^[6-9]\d{9}$/.test(value) ? "Enter a valid 10-digit phone number" : undefined;
    case "pincode":
      return !/^\d{6}$/.test(value) ? "Enter a valid 6-digit pincode" : undefined;
    default:
      return undefined;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const clearCart = useCartStore((s) => s.clearCart);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mockPaymentStep, setMockPaymentStep] = useState<"idle" | "confirming" | "processing">("idle");
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    description?: string;
  } | null>(null);
  const [orderData, setOrderData] = useState<{
    orderId: string;
    orderNumber: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    keyId: string;
    testMode: boolean;
  } | null>(null);

  // Form state
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    notes: "",
  });

  const shippingCost = subtotal >= 499 ? 0 : 49;
  const discountAmount = appliedCoupon?.discountAmount || 0;
  const total = subtotal + shippingCost - discountAmount;

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), subtotal }),
      });
      const data = await res.json();

      if (data.valid) {
        setAppliedCoupon({
          code: data.coupon.code,
          discountAmount: data.discountAmount,
          description: data.coupon.description,
        });
        setCouponError(null);
      } else {
        setCouponError(data.error || "Invalid coupon code");
        setAppliedCoupon(null);
      }
    } catch {
      setCouponError("Failed to validate coupon");
    }
    setCouponLoading(false);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const verifyPayment = async (
    paymentData: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
    orderId: string,
    orderNumber: string
  ) => {
    try {
      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...paymentData,
          orderId,
        }),
      });

      if (verifyRes.ok) {
        clearCart();
        router.push(`/order-success?orderNumber=${orderNumber}`);
      } else {
        setError("Payment verification failed. Contact support.");
      }
    } catch {
      setError("Payment verification failed. Contact support.");
    }
    setIsProcessing(false);
  };

  const handleMockPayment = async () => {
    if (!orderData) return;
    setMockPaymentStep("processing");

    // Simulate a short delay for realism
    await new Promise((resolve) => setTimeout(resolve, 1500));

    await verifyPayment(
      {
        razorpay_order_id: orderData.razorpayOrderId,
        razorpay_payment_id: `mock_pay_${Date.now()}`,
        razorpay_signature: "mock_signature_test_mode",
      },
      orderData.orderId,
      orderData.orderNumber
    );
    setMockPaymentStep("idle");
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    try {
      // 1. Create order via API
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          shippingAddress: {
            line1: form.addressLine1,
            line2: form.addressLine2 || undefined,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
          },
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || undefined,
            templateId: item.templateId || undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            customization: item.customization
              ? {
                  textFields: item.customization.textFields,
                  images: item.customization.images,
                }
              : undefined,
          })),
          notes: form.notes || undefined,
          couponCode: appliedCoupon?.code || undefined,
          discountAmount: discountAmount || undefined,
        }),
      });

      if (!orderRes.ok) {
        const data = await orderRes.json();
        throw new Error(data.error || "Failed to create order");
      }

      const data = await orderRes.json();
      setOrderData(data);

      // Test mode — show mock payment confirmation
      if (data.testMode) {
        setMockPaymentStep("confirming");
        setIsProcessing(false);
        return;
      }

      // 2. Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Payment gateway failed to load");

      // 3. Open Razorpay checkout
      const razorpay = new window.Razorpay({
        key: data.keyId,
        amount: data.amount * 100,
        currency: data.currency,
        name: "Creative Dhraa",
        description: `Order ${data.orderNumber}`,
        order_id: data.razorpayOrderId,
        handler: async (response: RazorpayResponse) => {
          await verifyPayment(response, data.orderId, data.orderNumber);
        },
        prefill: {
          name: form.customerName,
          email: form.customerEmail,
          contact: form.customerPhone,
        },
        theme: { color: "#6B8F71" },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      });

      razorpay.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsProcessing(false);
    }
  };

  // Empty cart redirect
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-foreground">Your cart is empty</h1>
        <p className="mt-2 text-muted">Add some products before checkout.</p>
        <a
          href="/shop"
          className="mt-6 inline-block rounded-full bg-accent px-8 py-3 text-sm font-semibold text-background hover:bg-accent-hover transition-colors"
        >
          Browse Shop
        </a>
      </div>
    );
  }

  // Mock payment confirmation modal
  if (mockPaymentStep !== "idle" && orderData) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-surface p-8 text-center shadow-lg"
        >
          {/* Test mode badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-50 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Test Mode
            </span>
          </div>

          <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-foreground">
            Simulate Payment
          </h2>
          <p className="mt-3 text-sm text-muted">
            Razorpay is not configured. Click below to simulate a successful payment for testing.
          </p>

          <div className="mt-6 rounded-xl border border-border bg-background p-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Order</span>
              <span className="font-mono text-foreground">{orderData.orderNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Amount</span>
              <span className="font-semibold text-accent">{formatPrice(orderData.amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Payment ID</span>
              <span className="font-mono text-xs text-muted">mock_pay_***</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={handleMockPayment}
              disabled={mockPaymentStep === "processing"}
              className="w-full rounded-full bg-accent py-3.5 text-sm font-semibold text-background hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {mockPaymentStep === "processing" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying Payment...
                </span>
              ) : (
                "Complete Test Payment"
              )}
            </button>
            <button
              onClick={() => {
                setMockPaymentStep("idle");
                setOrderData(null);
              }}
              disabled={mockPaymentStep === "processing"}
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>

          {error && (
            <p className="mt-4 text-sm text-error bg-error/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-foreground mb-8"
      >
        Checkout
      </motion.h1>

      <form onSubmit={handleCheckout} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left — Form Fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Contact Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                id="customerName"
                label="Full Name"
                required
                value={form.customerName}
                onChange={(v) => updateField("customerName", v)}
                error={getFieldError("customerName", form.customerName)}
              />
              <FormField
                id="customerEmail"
                label="Email"
                type="email"
                required
                value={form.customerEmail}
                onChange={(v) => updateField("customerEmail", v)}
                error={getFieldError("customerEmail", form.customerEmail)}
              />
              <FormField
                id="customerPhone"
                label="Phone (10 digits)"
                type="tel"
                pattern="[6-9][0-9]{9}"
                required
                value={form.customerPhone}
                onChange={(v) => updateField("customerPhone", v)}
                error={getFieldError("customerPhone", form.customerPhone)}
                className="sm:col-span-2"
              />
            </div>
          </div>

          {/* Shipping Address */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Shipping Address</h2>
            <div className="space-y-3">
              <FormField
                id="addressLine1"
                label="Address Line 1"
                required
                value={form.addressLine1}
                onChange={(v) => updateField("addressLine1", v)}
                error={getFieldError("addressLine1", form.addressLine1)}
              />
              <FormField
                id="addressLine2"
                label="Address Line 2 (optional)"
                value={form.addressLine2}
                onChange={(v) => updateField("addressLine2", v)}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormField
                  id="city"
                  label="City"
                  required
                  value={form.city}
                  onChange={(v) => updateField("city", v)}
                  error={getFieldError("city", form.city)}
                />
                <FormField
                  id="state"
                  label="State"
                  required
                  value={form.state}
                  onChange={(v) => updateField("state", v)}
                  error={getFieldError("state", form.state)}
                />
                <FormField
                  id="pincode"
                  label="Pincode"
                  pattern="\d{6}"
                  required
                  value={form.pincode}
                  onChange={(v) => updateField("pincode", v)}
                  error={getFieldError("pincode", form.pincode)}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Order Notes (Optional)</h2>
            <div className="relative">
              <textarea
                id="notes"
                rows={3}
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                className="peer w-full rounded-lg border border-border bg-background px-4 pt-5 pb-2 text-sm text-foreground placeholder-transparent focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                placeholder="Notes"
              />
              <label
                htmlFor="notes"
                className="pointer-events-none absolute left-4 top-3 text-xs text-muted peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-3 peer-focus:text-xs peer-focus:text-accent transition-all"
              >
                Special instructions for your order...
              </label>
            </div>
          </div>
        </div>

        {/* Right — Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-border bg-surface p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Order Summary</h2>

            {/* Items */}
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-surface-hover">
                    {item.productImage && (
                      <Image
                        src={item.productImage}
                        alt={item.productName}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {item.productName}
                    </p>
                    <p className="text-xs text-muted">Qty: {item.quantity}</p>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon Code */}
            <div className="border-t border-border pt-4">
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-lg bg-success/5 border border-success/20 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-success">
                      {appliedCoupon.code} applied
                    </p>
                    <p className="text-xs text-muted">
                      -{formatPrice(appliedCoupon.discountAmount)} off
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-xs text-error hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                    placeholder="Coupon code"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted focus:border-accent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="rounded-lg bg-accent/10 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/20 disabled:opacity-50 transition-colors"
                  >
                    {couponLoading ? "..." : "Apply"}
                  </button>
                </div>
              )}
              {couponError && (
                <p className="mt-1 text-xs text-error">{couponError}</p>
              )}
            </div>

            {/* Totals */}
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="text-foreground">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Shipping</span>
                <span className="text-foreground">
                  {shippingCost === 0 ? (
                    <span className="text-success">Free</span>
                  ) : (
                    formatPrice(shippingCost)
                  )}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Discount</span>
                  <span className="text-success font-medium">-{formatPrice(discountAmount)}</span>
                </div>
              )}
              {shippingCost > 0 && (
                <p className="text-xs text-accent">
                  Free shipping on orders above ₹499
                </p>
              )}
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-xl font-bold text-accent">
                  {formatPrice(total)}
                </span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-error bg-error/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Pay Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full rounded-full bg-accent py-3.5 text-sm font-semibold text-background hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all glow-accent"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                `Pay ${formatPrice(total)}`
              )}
            </button>

            <p className="text-center text-xs text-muted">
              Secured by Razorpay. 256-bit encryption.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
