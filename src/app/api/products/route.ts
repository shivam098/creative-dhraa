import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productImages, categories } from "@/lib/db/schema";
import { eq, desc, asc, ilike, and, inArray, sql } from "drizzle-orm";
import { productQuerySchema } from "@/lib/utils/validators";

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

    // Map images to products
    const imageMap = new Map(images.map((img) => [img.productId, img]));

    const data = productList.map((product) => ({
      ...product,
      price: product.price ? Number(product.price) : null,
      comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
      image: imageMap.get(product.id) || null,
    }));

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
