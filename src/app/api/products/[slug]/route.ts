import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  products,
  productImages,
  productVariants,
  designTemplates,
  categories,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Fetch product by slug
    const product = await db
      .select()
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (product.length === 0) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const p = product[0];

    // Only show published products (or admin override could be added later)
    if (p.status !== "published") {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Fetch related data in parallel
    const [images, variants, templates, category] = await Promise.all([
      db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, p.id))
        .orderBy(productImages.position),
      db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, p.id)),
      db
        .select()
        .from(designTemplates)
        .where(eq(designTemplates.productId, p.id)),
      p.categoryId
        ? db
            .select()
            .from(categories)
            .where(eq(categories.id, p.categoryId))
            .limit(1)
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      product: {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price ? Number(p.price) : null,
        comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
        category: category[0] || null,
        images: images.map((img) => ({
          id: img.id,
          url: img.url,
          altText: img.altText,
          position: img.position,
          isPrimary: img.isPrimary,
        })),
        variants: variants.map((v) => ({
          id: v.id,
          name: v.name,
          value: v.value,
          priceModifier: Number(v.priceModifier || 0),
          stock: v.stock,
        })),
        templates: templates.map((t) => ({
          id: t.id,
          name: t.name,
          previewUrl: t.previewUrl,
          layoutData: t.layoutData,
        })),
      },
    });
  } catch (error) {
    console.error("Product detail API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
