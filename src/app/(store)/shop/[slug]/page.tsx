"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Image from "next/image";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/stores/cart-store";
import { useSession } from "@/hooks/use-session";
import { formatPrice } from "@/lib/utils/validators";
import ImageUploader from "@/components/store/image-uploader";
import TemplatePicker from "@/components/store/template-picker";

interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  position: number;
  isPrimary: boolean;
}

interface Variant {
  id: string;
  name: string;
  value: string;
  priceModifier: number;
  stock: number | null;
}

interface Template {
  id: string;
  name: string;
  previewUrl: string;
  layoutData: unknown;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  comparePrice: number | null;
  category: { id: string; name: string; slug: string } | null;
  images: ProductImage[];
  variants: Variant[];
  templates: Template[];
}

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { sessionId } = useSession();
  const addItem = useCartStore((s) => s.addItem);

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [textFields, setTextFields] = useState<Record<string, string>>({});
  const [uploadedImages, setUploadedImages] = useState<
    Array<{ uploadId: string; publicUrl: string; filename: string }>
  >([]);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const res = await fetch(`/api/products/${slug}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Product not found");
        throw new Error("Failed to fetch product");
      }
      return res.json() as Promise<{ product: Product }>;
    },
  });

  const product = data?.product;

  const handleUploadComplete = useCallback(
    (images: Array<{ uploadId: string; publicUrl: string; filename: string }>) => {
      setUploadedImages(images);
    },
    []
  );

  const handleAddToCart = () => {
    if (!product || !product.price) return;

    const variantPrice = selectedVariant?.priceModifier || 0;
    const unitPrice = product.price + variantPrice;

    addItem({
      productId: product.id,
      productName: product.name,
      productImage: product.images[0]?.url || "",
      variantId: selectedVariant?.id,
      variantLabel: selectedVariant ? `${selectedVariant.name}: ${selectedVariant.value}` : undefined,
      templateId: selectedTemplate?.id,
      templateName: selectedTemplate?.name,
      quantity,
      unitPrice,
      customization: {
        templateId: selectedTemplate?.id,
        textFields,
        images: uploadedImages.map((img, i) => ({
          uploadId: img.uploadId,
          r2Url: img.publicUrl,
          position: `position_${i}`,
        })),
      },
    });

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="aspect-square skeleton rounded-xl" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 skeleton" />
            <div className="h-6 w-1/4 skeleton" />
            <div className="h-20 w-full skeleton" />
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-foreground">Product not found</h1>
        <p className="mt-2 text-muted">This product may have been removed or is no longer available.</p>
      </div>
    );
  }

  const currentPrice = product.price
    ? product.price + (selectedVariant?.priceModifier || 0)
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Image Gallery */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          {/* Main Image */}
          <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface">
            {product.images[selectedImage] ? (
              <Image
                src={product.images[selectedImage].url}
                alt={product.images[selectedImage].altText || product.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-16 w-16">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                </svg>
              </div>
            )}
          </div>

          {/* Thumbnail Strip */}
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.images.map((img, index) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(index)}
                  className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                    selectedImage === index
                      ? "border-accent"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.altText || `${product.name} ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Product Info + Customization */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {/* Breadcrumb */}
          {product.category && (
            <p className="text-xs text-muted">
              Shop / {product.category.name}
            </p>
          )}

          {/* Title + Price */}
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-foreground sm:text-3xl">
              {product.name}
            </h1>
            <div className="mt-3 flex items-center gap-3">
              {currentPrice ? (
                <>
                  <span className="text-2xl font-bold text-accent">
                    {formatPrice(currentPrice)}
                  </span>
                  {product.comparePrice && product.comparePrice > currentPrice && (
                    <span className="text-lg text-muted line-through">
                      {formatPrice(product.comparePrice)}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-lg text-muted italic">Price on request</span>
              )}
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-sm text-muted leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Variants */}
          {product.variants.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Options</h4>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`rounded-lg border px-4 py-2 text-sm transition-all ${
                      selectedVariant?.id === variant.id
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-muted hover:border-accent/50"
                    }`}
                  >
                    {variant.value}
                    {variant.priceModifier > 0 && (
                      <span className="ml-1 text-xs">
                        (+{formatPrice(variant.priceModifier)})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Template Picker */}
          {product.templates.length > 0 && (
            <TemplatePicker
              templates={product.templates}
              selectedId={selectedTemplate?.id || null}
              onSelect={(t) =>
                setSelectedTemplate(
                  product.templates.find((pt) => pt.id === t.id) || null
                )
              }
            />
          )}

          {/* Custom Text Fields */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">
              Personalization Text
            </h4>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Name (e.g., 'Sarah & Mike')"
                value={textFields.name || ""}
                onChange={(e) =>
                  setTextFields((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="text"
                placeholder="Date (e.g., '15.06.2024')"
                value={textFields.date || ""}
                onChange={(e) =>
                  setTextFields((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <textarea
                placeholder="Custom message (optional)"
                rows={2}
                value={textFields.message || ""}
                onChange={(e) =>
                  setTextFields((prev) => ({ ...prev, message: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">
              Upload Your Photos
            </h4>
            <ImageUploader
              sessionId={sessionId}
              maxFiles={5}
              onUploadComplete={handleUploadComplete}
            />
          </div>

          {/* Quantity + Add to Cart */}
          <div className="flex items-center gap-4 pt-4 border-t border-border">
            {/* Quantity */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted hover:border-accent hover:text-accent transition-colors"
              >
                -
              </button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted hover:border-accent hover:text-accent transition-colors"
              >
                +
              </button>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={!product.price || addedToCart}
              className="flex-1 rounded-full bg-accent py-3 text-sm font-semibold text-background hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all glow-accent"
            >
              <AnimatePresence mode="wait">
                {addedToCart ? (
                  <motion.span
                    key="added"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Added to Cart!
                  </motion.span>
                ) : (
                  <motion.span
                    key="add"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {product.price
                      ? `Add to Cart — ${formatPrice(currentPrice! * quantity)}`
                      : "Contact for Price"}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
