"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/utils/validators";

interface TrackedOrder {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  shippingCost: number;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
}

const STATUS_STEPS = ["pending", "processing", "shipped", "delivered"];
const STATUS_LABELS: Record<string, string> = {
  pending: "Order Placed",
  processing: "Being Crafted",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setOrder(null);

    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Order not found");
      }

      const data = await res.json();
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const currentStep = order
    ? STATUS_STEPS.indexOf(order.status)
    : -1;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-foreground text-center">
          Track Your Order
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          Enter your order number and email to check the status
        </p>
      </motion.div>

      {/* Search Form */}
      <form onSubmit={handleTrack} className="mt-8 space-y-4">
        <input
          required
          type="text"
          placeholder="Order Number (e.g., CD-260605-ABCD)"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <input
          required
          type="email"
          placeholder="Email address used for order"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-background hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {isLoading ? "Searching..." : "Track Order"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 text-center text-sm text-error"
        >
          {error}
        </motion.p>
      )}

      {/* Order Details */}
      {order && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 space-y-6"
        >
          {/* Status Progress */}
          {order.status !== "cancelled" ? (
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="flex items-center justify-between">
                {STATUS_STEPS.map((step, index) => (
                  <div key={step} className="flex flex-col items-center flex-1">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        index <= currentStep
                          ? "bg-accent text-background"
                          : "bg-border text-muted"
                      }`}
                    >
                      {index <= currentStep ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <p className={`mt-2 text-xs text-center ${index <= currentStep ? "text-accent font-medium" : "text-muted"}`}>
                      {STATUS_LABELS[step]}
                    </p>
                  </div>
                ))}
              </div>
              {/* Progress bar */}
              <div className="mt-4 h-1 w-full rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-error/30 bg-error/5 p-4 text-center">
              <p className="text-sm font-medium text-error">Order Cancelled</p>
            </div>
          )}

          {/* Order Info */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted">Order Number</p>
                <p className="font-medium text-foreground">{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-muted">Placed On</p>
                <p className="font-medium text-foreground">
                  {new Date(order.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted">Payment</p>
                <p className={`font-medium ${order.paymentStatus === "paid" ? "text-success" : "text-warning"}`}>
                  {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                </p>
              </div>
              <div>
                <p className="text-muted">Total</p>
                <p className="font-bold text-accent">{formatPrice(order.total)}</p>
              </div>
            </div>

            {/* Items */}
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-medium text-foreground mb-3">Items</h4>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted">
                      {item.productName} x{item.quantity}
                    </span>
                    <span className="text-foreground">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
