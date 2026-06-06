"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Suspense, useState } from "react";
import ProductGrid from "@/components/store/product-grid";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentCategory = searchParams.get("category") || "";
  const currentSearch = searchParams.get("search") || "";
  const currentSort = searchParams.get("sort") || "newest";
  const currentPage = Number(searchParams.get("page") || "1");

  const [searchInput, setSearchInput] = useState(currentSearch);

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json() as Promise<{ categories: Category[] }>;
    },
  });

  // Fetch products
  const { data, isLoading } = useQuery({
    queryKey: ["products", currentCategory, currentSearch, currentSort, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentCategory) params.set("category", currentCategory);
      if (currentSearch) params.set("search", currentSearch);
      params.set("sort", currentSort);
      params.set("page", String(currentPage));
      params.set("limit", "12");

      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    // Reset page when changing filters
    if (!("page" in updates)) {
      params.delete("page");
    }
    router.push(`/shop?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchInput });
  };

  const categories = categoriesData?.categories || [];
  const products = data?.products || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:pt-10 pb-12 sm:px-6 lg:px-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-light tracking-tight text-foreground sm:text-5xl">
          Shop
        </h1>
        <p className="mt-3 text-base text-muted">
          Browse our collection of handcrafted personalized gifts
        </p>
      </motion.div>

      {/* Filters Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateParams({ category: "" })}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              !currentCategory
                ? "bg-accent text-background font-medium"
                : "bg-surface text-muted hover:text-foreground border border-border"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => updateParams({ category: cat.slug })}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                currentCategory === cat.slug
                  ? "bg-accent text-background font-medium"
                  : "bg-surface text-muted hover:text-foreground border border-border"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search + Sort */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search..."
              className="h-9 w-40 rounded-lg border border-border bg-surface px-3 pr-8 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </button>
          </form>

          {/* Sort */}
          <select
            value={currentSort}
            onChange={(e) => updateParams({ sort: e.target.value })}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      {!isLoading && (
        <p className="mb-4 text-xs text-muted">
          Showing {products.length} of {pagination.total} products
        </p>
      )}

      {/* Product Grid */}
      <ProductGrid products={products} isLoading={isLoading} />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            disabled={currentPage <= 1}
            onClick={() => updateParams({ page: String(currentPage - 1) })}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-muted">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            disabled={currentPage >= pagination.totalPages}
            onClick={() => updateParams({ page: String(currentPage + 1) })}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-10 w-32 skeleton mb-8" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-border bg-surface">
                <div className="aspect-square skeleton" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-3/4 skeleton" />
                  <div className="h-4 w-1/2 skeleton" />
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  );
}
