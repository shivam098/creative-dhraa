"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { formatPrice } from "@/lib/utils/validators";
import { WishlistButton } from "@/components/store/wishlist-button";

// Beautiful gradient fallbacks for when images fail to load
const FALLBACK_GRADIENTS = [
  "from-sage-100 via-emerald-50 to-teal-100",
  "from-amber-50 via-orange-50 to-rose-50",
  "from-sky-50 via-blue-50 to-indigo-50",
  "from-purple-50 via-fuchsia-50 to-pink-50",
  "from-lime-50 via-green-50 to-emerald-50",
  "from-rose-50 via-pink-50 to-purple-50",
];

function getGradient(id: string) {
  const idx = id.charCodeAt(0) % FALLBACK_GRADIENTS.length;
  return FALLBACK_GRADIENTS[idx];
}

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  comparePrice: number | null;
  salePrice?: number | null;
  badge?: string | null;
  image: { url: string; altText: string | null } | null;
}

export default function ProductCard({
  id,
  name,
  slug,
  price,
  comparePrice,
  salePrice,
  badge,
  image,
}: ProductCardProps) {
  const [imgError, setImgError] = useState(false);

  // Determine display price and original price for strikethrough
  const displayPrice = salePrice && price && salePrice < price ? salePrice : price;
  const originalPrice = salePrice && price && salePrice < price ? price : comparePrice;

  const discount =
    displayPrice && originalPrice && originalPrice > displayPrice
      ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
      : null;

  const showFallback = !image || imgError;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
    >
      <Link
        href={`/shop/${slug}`}
        className="group block overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-500 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5"
      >
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-surface-hover">
          {showFallback ? (
            <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${getGradient(id)}`}>
              {/* Beautiful abstract gift illustration */}
              <div className="relative flex flex-col items-center gap-3">
                <div className="relative">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={0.8}
                    stroke="currentColor"
                    className="h-16 w-16 text-accent/40"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                    />
                  </svg>
                  {/* Sparkle */}
                  <motion.div
                    className="absolute -top-1 -right-1 h-3 w-3 text-accent/50"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
                    </svg>
                  </motion.div>
                </div>
                <span className="text-[10px] font-medium uppercase tracking-widest text-accent/40">
                  Creative Dhraa
                </span>
              </div>
            </div>
          ) : (
            <Image
              src={image.url}
              alt={image.altText || name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              onError={() => setImgError(true)}
            />
          )}

          {/* Discount Badge */}
          {discount && discount > 0 && (
            <span className="absolute top-3 left-3 rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-background">
              -{discount}%
            </span>
          )}

          {/* Wishlist Button */}
          <div className="absolute top-3 right-3 z-10">
            <WishlistButton productId={id} size="sm" />
          </div>

          {/* Product Badge (Top Seller, New Arrival, etc.) */}
          {badge && !discount && (
            <span className="absolute top-3 left-3 rounded-full bg-foreground/90 px-2.5 py-0.5 text-xs font-bold text-background">
              {badge}
            </span>
          )}
          {badge && discount && discount > 0 && (
            <span className="absolute top-3 right-3 rounded-full bg-foreground/90 px-2.5 py-0.5 text-xs font-bold text-background">
              {badge}
            </span>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="absolute bottom-3 left-0 right-0 flex justify-center opacity-0 transition-all group-hover:opacity-100 group-hover:translate-y-0 translate-y-2">
            <span className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-background shadow-lg">
              View Details
            </span>
          </div>
        </div>

        {/* Product Info */}
        <div className="p-4">
          <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-accent transition-colors">
            {name}
          </h3>
          <div className="mt-2 flex items-center gap-2">
            {displayPrice ? (
              <>
                <span className="text-base font-bold text-accent">
                  {formatPrice(displayPrice)}
                </span>
                {originalPrice && originalPrice > displayPrice && (
                  <span className="text-xs text-muted line-through">
                    {formatPrice(originalPrice)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-muted italic">Price on request</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
