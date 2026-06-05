import {
  pgTable,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  jsonb,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const productStatusEnum = pgEnum("product_status", [
  "draft",
  "published",
  "archived",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

export const uploadStatusEnum = pgEnum("upload_status", [
  "pending",
  "linked",
  "orphaned",
]);

export const discountTypeEnum = pgEnum("discount_type", [
  "percentage",
  "flat",
]);

// ─── Categories ───────────────────────────────────────────────────────────────

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Products ─────────────────────────────────────────────────────────────────

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }),
  comparePrice: decimal("compare_price", { precision: 10, scale: 2 }),
  categoryId: uuid("category_id").references(() => categories.id),
  status: productStatusEnum("status").default("draft").notNull(),
  customFields: jsonb("custom_fields").$type<Record<string, string>>(), // e.g. { "Song Name": "Happy Birthday", "Frame Material": "Acrylic" }
  minImages: integer("min_images").default(0).notNull(), // minimum customer photos required
  maxImages: integer("max_images").default(5).notNull(), // maximum customer photos allowed
  badge: text("badge"), // "Top Seller", "New Arrival", "Best Value", etc.
  sortOrder: integer("sort_order").default(0).notNull(),
  instagramPostId: text("instagram_post_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Product Images ───────────────────────────────────────────────────────────

export const productImages = pgTable("product_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  altText: text("alt_text"),
  position: integer("position").default(0).notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
});

// ─── Product Variants ─────────────────────────────────────────────────────────

export const productVariants = pgTable("product_variants", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Size", "Color"
  value: text("value").notNull(), // e.g., "Large", "Gold"
  priceModifier: decimal("price_modifier", { precision: 10, scale: 2 }).default(
    "0"
  ),
  stock: integer("stock").default(0),
});

// ─── Design Templates ─────────────────────────────────────────────────────────

export const designTemplates = pgTable("design_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  previewUrl: text("preview_url").notNull(),
  layoutData: jsonb("layout_data"), // JSON describing text/image placement zones
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Orders ───────────────────────────────────────────────────────────────────

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  shippingAddress: jsonb("shipping_address").notNull(),
  status: orderStatusEnum("status").default("pending").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default(
    "0"
  ),
  discountAmount: decimal("discount_amount", {
    precision: 10,
    scale: 2,
  }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentId: text("payment_id"),
  paymentStatus: paymentStatusEnum("payment_status")
    .default("pending")
    .notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Order Items ──────────────────────────────────────────────────────────────

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  variantId: uuid("variant_id").references(() => productVariants.id),
  templateId: uuid("template_id").references(() => designTemplates.id),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  customization: jsonb("customization"),
  // Expected shape:
  // {
  //   text_fields: { name: string, date: string, message: string },
  //   images: [{ upload_id: string, r2_url: string, position: string }]
  // }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Customer Uploads ─────────────────────────────────────────────────────────

export const customerUploads = pgTable("customer_uploads", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderItemId: uuid("order_item_id").references(() => orderItems.id),
  sessionId: text("session_id").notNull(),
  r2Key: text("r2_key").notNull(),
  r2Url: text("r2_url").notNull(),
  originalFilename: text("original_filename"),
  fileType: text("file_type").notNull(), // jpeg, png, webp
  fileSizeBytes: integer("file_size_bytes"),
  width: integer("width"),
  height: integer("height"),
  status: uploadStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

// ─── Admin Users ──────────────────────────────────────────────────────────────

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
});

// ─── Coupons ──────────────────────────────────────────────────────────────────

export const coupons = pgTable("coupons", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description"),
  discountType: discountTypeEnum("discount_type").notNull(),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(), // % or flat INR
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }).default("0"),
  maxDiscountAmount: decimal("max_discount_amount", { precision: 10, scale: 2 }), // cap for % discounts
  usageLimit: integer("usage_limit"), // null = unlimited
  usageCount: integer("usage_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isPublic: boolean("is_public").default(false).notNull(), // Show on storefront banner
  startsAt: timestamp("starts_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Product Discounts (sale price overrides) ─────────────────────────────────

export const productDiscounts = pgTable("product_discounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  discountType: discountTypeEnum("discount_type").notNull(),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  startsAt: timestamp("starts_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Category Discounts (e.g. 20% off all Keychains) ─────────────────────────

export const categoryDiscounts = pgTable("category_discounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  discountType: discountTypeEnum("discount_type").notNull(),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  startsAt: timestamp("starts_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  customerName: text("customer_name").notNull(),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
  variants: many(productVariants),
  templates: many(designTemplates),
  reviews: many(reviews),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const productVariantsRelations = relations(
  productVariants,
  ({ one }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
  })
);

export const designTemplatesRelations = relations(
  designTemplates,
  ({ one }) => ({
    product: one(products, {
      fields: [designTemplates.productId],
      references: [products.id],
    }),
  })
);

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
  template: one(designTemplates, {
    fields: [orderItems.templateId],
    references: [designTemplates.id],
  }),
  uploads: many(customerUploads),
}));

export const customerUploadsRelations = relations(
  customerUploads,
  ({ one }) => ({
    orderItem: one(orderItems, {
      fields: [customerUploads.orderItemId],
      references: [orderItems.id],
    }),
  })
);

export const productDiscountsRelations = relations(
  productDiscounts,
  ({ one }) => ({
    product: one(products, {
      fields: [productDiscounts.productId],
      references: [products.id],
    }),
  })
);

export const categoryDiscountsRelations = relations(
  categoryDiscounts,
  ({ one }) => ({
    category: one(categories, {
      fields: [categoryDiscounts.categoryId],
      references: [categories.id],
    }),
  })
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
}));
