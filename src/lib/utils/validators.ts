import { z } from "zod";

// ─── Product Schemas ──────────────────────────────────────────────────────────

export const productQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
  sort: z.enum(["newest", "price_asc", "price_desc", "name"]).default("newest"),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;

// ─── Upload Schemas ───────────────────────────────────────────────────────────

export const presignRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  fileSizeBytes: z.number().int().positive().max(10 * 1024 * 1024), // 10MB max
  sessionId: z.string().min(1),
});

export type PresignRequest = z.infer<typeof presignRequestSchema>;

// ─── Checkout / Order Schemas ─────────────────────────────────────────────────

export const shippingAddressSchema = z.object({
  line1: z.string().min(1, "Address is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Invalid pincode"),
  country: z.string().default("India"),
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

export const checkoutItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  quantity: z.number().int().positive().max(10),
  unitPrice: z.number().positive(),
  customization: z
    .object({
      textFields: z.record(z.string(), z.string()).optional(),
      images: z
        .array(
          z.object({
            uploadId: z.string(),
            r2Url: z.string().url(),
            position: z.string(),
          })
        )
        .optional(),
    })
    .optional(),
});

export const checkoutSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  customerEmail: z.string().email("Invalid email"),
  customerPhone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone number"),
  shippingAddress: shippingAddressSchema,
  items: z.array(checkoutItemSchema).min(1, "Cart cannot be empty"),
  notes: z.string().max(500).optional(),
});

export type CheckoutData = z.infer<typeof checkoutSchema>;

// ─── Payment Schemas ──────────────────────────────────────────────────────────

export const paymentVerifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  orderId: z.string().uuid(),
});

export type PaymentVerifyData = z.infer<typeof paymentVerifySchema>;

// ─── Admin Schemas ────────────────────────────────────────────────────────────

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type AdminLoginData = z.infer<typeof adminLoginSchema>;

export const productUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  comparePrice: z.number().positive().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export type ProductUpdateData = z.infer<typeof productUpdateSchema>;

export const productCreateSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  comparePrice: z.number().positive().optional(),
  categoryId: z.string().uuid("Select a category"),
  status: z.enum(["draft", "published"]).default("published"),
  imageUrl: z.string().url("Enter a valid image URL").optional(),
});

export type ProductCreateData = z.infer<typeof productCreateSchema>;

export const bulkPriceUpdateSchema = z.object({
  updates: z.array(
    z.object({
      productId: z.string().uuid(),
      price: z.number().positive(),
      comparePrice: z.number().positive().optional(),
    })
  ),
});

export type BulkPriceUpdateData = z.infer<typeof bulkPriceUpdateSchema>;

// ─── Order Tracking Schema ────────────────────────────────────────────────────

export const trackOrderSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
  email: z.string().email("Invalid email"),
});

export type TrackOrderData = z.infer<typeof trackOrderSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format price in INR
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generate a slug from a string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/**
 * Generate order number like CD-240615-XXXX
 */
export function generateOrderNumber(): string {
  const now = new Date();
  const date = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CD-${date}-${random}`;
}
