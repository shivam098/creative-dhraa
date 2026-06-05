import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  products,
  productImages,
  productVariants,
  designTemplates,
  categories,
  productDiscounts,
  categoryDiscounts,
} from "@/lib/db/schema";
import { eq, and, lte, gte, or, isNull } from "drizzle-orm";

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

    // Only show published products
    if (p.status !== "published") {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Fetch related data in parallel
    const now = new Date();
    const [images, variants, templates, category, prodDiscountRows, catDiscountRows] =
      await Promise.all([
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
        // Active product discount
        db
          .select()
          .from(productDiscounts)
          .where(
            and(
              eq(productDiscounts.productId, p.id),
              eq(productDiscounts.isActive, true),
              lte(productDiscounts.startsAt, now),
              or(
                isNull(productDiscounts.expiresAt),
                gte(productDiscounts.expiresAt, now)
              )
            )
          )
          .limit(1),
        // Active category discount
        p.categoryId
          ? db
              .select()
              .from(categoryDiscounts)
              .where(
                and(
                  eq(categoryDiscounts.categoryId, p.categoryId),
                  eq(categoryDiscounts.isActive, true),
                  lte(categoryDiscounts.startsAt, now),
                  or(
                    isNull(categoryDiscounts.expiresAt),
                    gte(categoryDiscounts.expiresAt, now)
                  )
                )
              )
              .limit(1)
          : Promise.resolve([]),
      ]);

    // Compute sale price
    const price = p.price ? Number(p.price) : null;
    let salePrice: number | null = null;
    let discountLabel: string | null = null;

    if (price) {
      const prodDiscount = prodDiscountRows[0];
      const catDiscount = catDiscountRows[0];

      if (prodDiscount) {
        salePrice = computeSalePrice(
          price,
          prodDiscount.discountType,
          Number(prodDiscount.discountValue)
        );
        discountLabel =
          prodDiscount.discountType === "percentage"
            ? `${Number(prodDiscount.discountValue)}% off`
            : `${Number(prodDiscount.discountValue)} off`;
      } else if (catDiscount) {
        salePrice = computeSalePrice(
          price,
          catDiscount.discountType,
          Number(catDiscount.discountValue)
        );
        discountLabel =
          catDiscount.discountType === "percentage"
            ? `${Number(catDiscount.discountValue)}% off`
            : `${Number(catDiscount.discountValue)} off`;
      }
    }

    return NextResponse.json({
      product: {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price,
        comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
        salePrice,
        discountLabel,
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
