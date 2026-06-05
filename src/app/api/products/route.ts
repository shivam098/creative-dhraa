import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  products,
  productImages,
  categories,
  productDiscounts,
  categoryDiscounts,
} from "@/lib/db/schema";
import { eq, desc, asc, ilike, and, inArray, sql, lte, gte, or, isNull } from "drizzle-orm";
import { productQuerySchema } from "@/lib/utils/validators";

function computeSalePrice(
  price: number,
  discountType: "percentage" | "flat",
  discountValue: number
): number {
  if (discountType === "percentage") {
    return Math.round(price * (1 - discountValue / 100));
  }
  return Math.max(0, price - discountValue);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const parsed = productQuerySchema.safeParse({
      category: searchParams.get("category") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 12,
      sort: searchParams.get("sort") || "newest",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { category, search, page, limit, sort } = parsed.data;
    const offset = (page - 1) * limit;

    // Build conditions - only show published products
    const conditions = [eq(products.status, "published")];

    if (category) {
      const cat = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, category))
        .limit(1);

      if (cat.length > 0) {
        conditions.push(eq(products.categoryId, cat[0].id));
      }
    }

    if (search) {
      conditions.push(ilike(products.name, `%${search}%`));
    }

    // Build sort
    const orderBy =
      sort === "price_asc"
        ? asc(products.price)
        : sort === "price_desc"
          ? desc(products.price)
          : sort === "name"
            ? asc(products.name)
            : desc(products.createdAt);

    // Execute query with images
    const [productList, countResult] = await Promise.all([
      db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          description: products.description,
          price: products.price,
          comparePrice: products.comparePrice,
          categoryId: products.categoryId,
        })
        .from(products)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(and(...conditions)),
    ]);

    // Fetch primary images for all products
    const productIds = productList.map((p) => p.id);
    const images =
      productIds.length > 0
        ? await db
            .select({
              productId: productImages.productId,
              url: productImages.url,
              altText: productImages.altText,
            })
            .from(productImages)
            .where(
              and(
                eq(productImages.isPrimary, true),
                inArray(productImages.productId, productIds)
              )
            )
        : [];

    // Fetch active product discounts
    const now = new Date();
    const activeProductDiscounts =
      productIds.length > 0
        ? await db
            .select({
              productId: productDiscounts.productId,
              discountType: productDiscounts.discountType,
              discountValue: productDiscounts.discountValue,
            })
            .from(productDiscounts)
            .where(
              and(
                eq(productDiscounts.isActive, true),
                lte(productDiscounts.startsAt, now),
                or(
                  isNull(productDiscounts.expiresAt),
                  gte(productDiscounts.expiresAt, now)
                ),
                inArray(productDiscounts.productId, productIds)
              )
            )
        : [];

    // Fetch active category discounts
    const categoryIds = [...new Set(productList.map((p) => p.categoryId).filter(Boolean))] as string[];
    const activeCategoryDiscounts =
      categoryIds.length > 0
        ? await db
            .select({
              categoryId: categoryDiscounts.categoryId,
              discountType: categoryDiscounts.discountType,
              discountValue: categoryDiscounts.discountValue,
            })
            .from(categoryDiscounts)
            .where(
              and(
                eq(categoryDiscounts.isActive, true),
                lte(categoryDiscounts.startsAt, now),
                or(
                  isNull(categoryDiscounts.expiresAt),
                  gte(categoryDiscounts.expiresAt, now)
                ),
                inArray(categoryDiscounts.categoryId, categoryIds)
              )
            )
        : [];

    // Build lookup maps
    const imageMap = new Map(images.map((img) => [img.productId, img]));
    const prodDiscountMap = new Map(
      activeProductDiscounts.map((d) => [d.productId, d])
    );
    const catDiscountMap = new Map(
      activeCategoryDiscounts.map((d) => [d.categoryId, d])
    );

    const data = productList.map((product) => {
      const price = product.price ? Number(product.price) : null;
      let salePrice: number | null = null;

      if (price) {
        // Product-level discount takes priority
        const prodDiscount = prodDiscountMap.get(product.id);
        if (prodDiscount) {
          salePrice = computeSalePrice(
            price,
            prodDiscount.discountType,
            Number(prodDiscount.discountValue)
          );
        } else if (product.categoryId) {
          // Fall back to category discount
          const catDiscount = catDiscountMap.get(product.categoryId);
          if (catDiscount) {
            salePrice = computeSalePrice(
              price,
              catDiscount.discountType,
              Number(catDiscount.discountValue)
            );
          }
        }
      }

      return {
        ...product,
        price,
        comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
        salePrice,
        image: imageMap.get(product.id) || null,
      };
    });

    const total = Number(countResult[0]?.count || 0);

    return NextResponse.json({
      products: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Products API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
