"use client";

import { motion } from "framer-motion";
import { useWishlistStore } from "@/stores/wishlist-store";
import { useAuthStore } from "@/stores/auth-store";
import { useTrackEvent } from "@/hooks/use-track-event";

interface WishlistButtonProps {
  productId: string;
  className?: string;
  size?: "sm" | "md";
}

export function WishlistButton({ productId, className = "", size = "md" }: WishlistButtonProps) {
  const { isInWishlist, addItem, removeItem } = useWishlistStore();
  const { user } = useAuthStore();
  const { track } = useTrackEvent();
  const isWishlisted = isInWishlist(productId);

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const buttonSize = size === "sm" ? "w-8 h-8" : "w-10 h-10";

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (isWishlisted) {
      removeItem(productId);
      // Sync with server
      if (user) {
        fetch("/api/wishlist", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
      }
    } else {
      addItem(productId);
      track("wishlist_add", { metadata: { productId } });
      // Sync with server
      if (user) {
        fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
      }
    }
  }

  return (
    <motion.button
      onClick={handleToggle}
      className={`${buttonSize} rounded-full flex items-center justify-center border transition-all duration-300 ${
        isWishlisted
          ? "bg-red-50 border-red-200 text-red-500"
          : "bg-white/80 backdrop-blur-sm border-border hover:border-red-200 hover:text-red-500 text-muted"
      } ${className}`}
      whileTap={{ scale: 0.85 }}
      aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isWishlisted ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={isWishlisted ? 0 : 1.5}
        className={iconSize}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
        />
      </svg>
    </motion.button>
  );
}
