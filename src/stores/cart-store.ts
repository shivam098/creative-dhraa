import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartCustomization {
  templateId?: string;
  textFields: Record<string, string>;
  images: Array<{
    uploadId: string;
    r2Url: string;
    position: string;
  }>;
}

export interface CartItem {
  id: string; // unique cart item id
  productId: string;
  productName: string;
  productImage: string;
  variantId?: string;
  variantLabel?: string;
  templateId?: string;
  templateName?: string;
  quantity: number;
  unitPrice: number;
  customization: CartCustomization;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;

  // Actions
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;

  // Computed
  totalItems: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) => {
        const id = `cart_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        set((state) => ({
          items: [...state.items, { ...item, id }],
          isOpen: true, // Open cart drawer when item is added
        }));
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      totalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      subtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0
        );
      },
    }),
    {
      name: "creative-dhraa-cart",
      partialize: (state) => ({ items: state.items }), // Only persist items, not UI state
    }
  )
);
