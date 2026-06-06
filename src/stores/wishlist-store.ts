"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistItem {
  productId: string;
  addedAt: string;
}

interface WishlistState {
  items: WishlistItem[];
  addItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearAll: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (productId) => {
        const existing = get().items.find((i) => i.productId === productId);
        if (existing) return;
        set((state) => ({
          items: [...state.items, { productId, addedAt: new Date().toISOString() }],
        }));
      },
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));
      },
      isInWishlist: (productId) => {
        return get().items.some((i) => i.productId === productId);
      },
      clearAll: () => set({ items: [] }),
    }),
    {
      name: "creative-dhraa-wishlist",
    }
  )
);
