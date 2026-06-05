import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  products,
  productImages,
  productDiscounts,
  categoryDiscounts,
} from "@/lib/db/schema";
import { eq, and, sql, lte, or, isNull } from "drizzle-orm";

/**
 * GET /api/products/on-sale — Get products with active discounts
 */
export async function GET(_request: NextRequest) {
  try {
    const now = new Date();

    // Get all published products
    const allProducts = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        comparePrice: products.comparePrice,
        categoryId: products.categoryId,
        badge: products.badge,
      })
      .from(products)
      .where(eq(products.status, "published"));

    // Get active product-level discounts
    const activeProductDiscounts = await db
      .select()
      .from(productDiscounts)
      .where(
        and(
          eq(productDiscounts.isActive, true),
          lte(productDiscounts.startsAt, now),
          or(
            isNull(productDiscounts.expiresAt),
            sql`${productDiscounts.expiresAt} > ${now}`
          )
        )
      );

    // Get active category-level discounts
    const activeCategoryDiscounts = await db
      .select()
      .from(categoryDiscounts)
      .where(
        and(
          eq(categoryDiscounts.isActive, true),
          lte(categoryDiscounts.startsAt, now),
          or(
            isNull(categoryDiscounts.expiresAt),
            sql`${categoryDiscounts.expiresAt} > ${now}`
          )
        )
      );

    // Build lookup maps
    const prodDiscMap = new Map(
      activeProductDiscounts.map((d) => [d.productId, d])
    );
    const catDiscMap = new Map(
      activeCategoryDiscounts.map((d) => [d.categoryId, d])
    );

    // Filter products that have an active discount and compute sale price
    const onSaleProducts: Array<{
      id: string;
      name: string;
      slug: string;
      price: number | null;
      comparePrice: number | null;
      salePrice: number;
      discountLabel: string;
      badge: string | null;
      image: { url: string; altText: string | null } | null;
    }> = [];

    for (const product of allProducts) {
      const basePrice = product.price ? parseFloat(product.price) : null;
      if (!basePrice) continue;

      let salePrice: number | null = null;
      let discountLabel = "";

      // Product-level discount takes priority
      const pDisc = prodDiscMap.get(product.id);
      if (pDisc) {
        const val = parseFloat(pDisc.discountValue);
        if (pDisc.discountType === "percentage") {
          salePrice = basePrice * (1 - val / 100);
          discountLabel = `${val}% OFF`;
        } else {
          salePrice = basePrice - val;
          discountLabel = `₹${val} OFF`;
        }
      } else if (product.categoryId) {
        // Category-level discount
        const cDisc = catDiscMap.get(product.categoryId);
        if (cDisc) {
          const val = parseFloat(cDisc.discountValue);
          if (cDisc.discountType === "percentage") {
            salePrice = basePrice * (1 - val / 100);
            discountLabel = `${val}% OFF`;
          } else {
            salePrice = basePrice - val;
            discountLabel = `₹${val} OFF`;
          }
        }
      }

      if (salePrice !== null && salePrice < basePrice) {
        onSaleProducts.push({
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: basePrice,
          comparePrice: product.comparePrice
            ? parseFloat(product.comparePrice)
            : null,
          salePrice: Math.round(salePrice),
          discountLabel,
          badge: product.badge,
          image: null, // Will be filled below
        });
      }
    }

    // Fetch primary images for on-sale products
    if (onSaleProducts.length > 0) {
      const productIds = onSaleProducts.map((p) => p.id);
      const images = await db
        .select()
        .from(productImages)
        .where(sql`${productImages.productId} IN (${sql.join(productIds.map(id => sql`${id}`), sql`, `)})`);

      const imageMap = new Map<
        string,
        { url: string; altText: string | null }
      >();
      for (const img of images) {
        if (!imageMap.has(img.productId) || img.isPrimary) {
          imageMap.set(img.productId, { url: img.url, altText: img.altText });
        }
      }

      for (const product of onSaleProducts) {
        product.image = imageMap.get(product.id) || null;
      }
    }

    return NextResponse.json({
      products: onSaleProducts,
      count: onSaleProducts.length,
    });
  } catch (error) {
    console.error("On-sale products error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
