"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber");

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 20 }}
        className="space-y-6"
      >
        {/* Success Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-10 w-10 text-success"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>

        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-foreground">
            Order Confirmed!
          </h1>
          <p className="mt-3 text-muted">
            Thank you for your order. We&apos;ll start crafting your personalized gift right away.
          </p>
        </div>

        {orderNumber && (
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">Order Number</p>
            <p className="mt-1 text-lg font-bold text-accent">{orderNumber}</p>
            <p className="mt-2 text-xs text-muted">
              A confirmation email has been sent to your email address.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href={`/track/${orderNumber}`}
            className="block rounded-full bg-accent py-3 text-sm font-semibold text-background hover:bg-accent-hover transition-colors"
          >
            Track Order
          </Link>
          <Link
            href="/shop"
            className="block rounded-full border border-border py-3 text-sm font-medium text-muted hover:text-foreground hover:border-accent/50 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-muted">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
