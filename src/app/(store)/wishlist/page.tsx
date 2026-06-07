"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useWishlistStore } from "@/stores/wishlist-store";
import { useAuthStore } from "@/stores/auth-store";
import { useTrackEvent } from "@/hooks/use-track-event";
import Link from "next/link";

interface WishlistProduct {
  id: string;
  name: string;
  slug: string;
  price: string | null;
  comparePrice: string | null;
  image: string | null;
}

export default function WishlistPage() {
  const { items, removeItem } = useWishlistStore();
  const { user } = useAuthStore();
  const { track } = useTrackEvent();
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch product details for wishlist items
  useEffect(() => {
    async function fetchProducts() {
      if (items.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        // If logged in, fetch from server wishlist
        if (user) {
          const res = await fetch("/api/wishlist");
          const data = await res.json();
          setProducts(data.items?.map((i: { product: WishlistProduct }) => i.product).filter(Boolean) || []);
        } else {
          // For anonymous users, fetch product details individually
          const productPromises = items.map(async (item) => {
            try {
              const res = await fetch(`/api/products/${item.productId}`);
              if (!res.ok) return null;
              const data = await res.json();
              return {
                id: data.product.id,
                name: data.product.name,
                slug: data.product.slug,
                price: data.product.price,
                comparePrice: data.product.comparePrice,
                image: data.product.images?.[0]?.url || null,
              };
            } catch {
              return null;
            }
          });
          const results = await Promise.all(productPromises);
          setProducts(results.filter(Boolean) as WishlistProduct[]);
        }
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [items, user]);

  function handleRemove(productId: string) {
    removeItem(productId);
    // Sync with server if logged in
    if (user) {
      fetch("/api/wishlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
    }
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] max-w-4xl mx-auto px-4 py-12 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-[family-name:var(--font-playfair)] text-2xl sm:text-3xl font-light mb-2">
          My Wishlist
        </h1>
        <p className="text-sm text-muted mb-8">
          {products.length} {products.length === 1 ? "item" : "items"} saved
        </p>

        {products.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-accent">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
              </svg>
            </div>
            <h2 className="text-lg font-medium mb-2">Your wishlist is empty</h2>
            <p className="text-sm text-muted mb-6">Browse our collection and save your favourite items.</p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-white text-sm font-medium hover:bg-accent transition-colors"
            >
              Start Shopping →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group rounded-2xl border border-border overflow-hidden hover:border-accent/20 transition-colors"
              >
                {/* Image */}
                <Link href={`/shop/${product.slug}`} className="block">
                  <div className="aspect-square bg-surface-hover relative overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-accent/5 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-accent/30">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 0 0 1.5-1.5V5.25a1.5 1.5 0 0 0-1.5-1.5H3.75a1.5 1.5 0 0 0-1.5 1.5v14.25c0 .828.672 1.5 1.5 1.5Z" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Content */}
                <div className="p-4">
                  <Link href={`/shop/${product.slug}`}>
                    <h3 className="text-sm font-medium line-clamp-1 group-hover:text-accent transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="mt-1.5 flex items-center gap-2">
                    {product.price && (
                      <span className="text-base font-semibold">₹{parseFloat(product.price)}</span>
                    )}
                    {product.comparePrice && parseFloat(product.comparePrice) > 0 && (
                      <span className="text-xs text-muted line-through">₹{parseFloat(product.comparePrice)}</span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/shop/${product.slug}`}
                      className="flex-1 py-2 px-3 rounded-full bg-foreground text-white text-xs font-medium text-center hover:bg-accent transition-colors"
                    >
                      View Product
                    </Link>
                    <button
                      onClick={() => handleRemove(product.id)}
                      className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-error/10 hover:border-error/30 transition-colors"
                      aria-label="Remove from wishlist"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
