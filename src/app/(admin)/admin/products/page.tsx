"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "@/lib/utils/validators";

interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  comparePrice: number | null;
  status: string;
  categoryId: string | null;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [editingPrices, setEditingPrices] = useState<Record<string, { price: string; comparePrice: string }>>({});
  const [bulkMode, setBulkMode] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    price: "",
    comparePrice: "",
    categoryId: "",
    status: "published" as "draft" | "published",
    imageUrl: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "products", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "50");
      const res = await fetch(`/api/admin/products?${params}`);
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to load products");
      return res.json();
    },
    retry: false,
  });

  const { data: categoriesData } = useQuery<{ categories: Category[] }>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) return { categories: [] };
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create product");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      setShowCreateForm(false);
      setCreateForm({ name: "", description: "", price: "", comparePrice: "", categoryId: "", status: "published", imageUrl: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });

  const bulkPriceMutation = useMutation({
    mutationFn: async (updates: Array<{ productId: string; price: number; comparePrice?: number }>) => {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      setEditingPrices({});
      setBulkMode(false);
    },
  });

  const products: AdminProduct[] = data?.products || [];
  const categories = categoriesData?.categories || [];

  const handlePublish = (id: string) => updateMutation.mutate({ id, data: { status: "published" } });
  const handleArchive = (id: string) => updateMutation.mutate({ id, data: { status: "archived" } });

  const handleSaveBulkPrices = () => {
    const updates = Object.entries(editingPrices)
      .filter(([_, val]) => val.price)
      .map(([productId, val]) => ({
        productId,
        price: Number(val.price),
        comparePrice: val.comparePrice ? Number(val.comparePrice) : undefined,
      }));
    if (updates.length > 0) bulkPriceMutation.mutate(updates);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name: createForm.name,
      description: createForm.description || undefined,
      price: Number(createForm.price),
      comparePrice: createForm.comparePrice ? Number(createForm.comparePrice) : undefined,
      categoryId: createForm.categoryId,
      status: createForm.status,
      imageUrl: createForm.imageUrl || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted mt-1">
            {data?.pagination?.total || 0} total products
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
          >
            + Add Product
          </button>
          <button
            onClick={() => setBulkMode(!bulkMode)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              bulkMode
                ? "bg-accent text-background"
                : "border border-border text-muted hover:text-foreground"
            }`}
          >
            {bulkMode ? "Exit Bulk Edit" : "Bulk Price Edit"}
          </button>
          {bulkMode && Object.keys(editingPrices).length > 0 && (
            <button
              onClick={handleSaveBulkPrices}
              disabled={bulkPriceMutation.isPending}
              className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-background"
            >
              {bulkPriceMutation.isPending ? "Saving..." : `Save ${Object.keys(editingPrices).length} Prices`}
            </button>
          )}
        </div>
      </div>

      {/* Create Product Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreateSubmit}
            className="rounded-xl border border-border bg-surface p-6 space-y-4"
          >
            <h3 className="font-semibold text-foreground">Add New Product</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-xs text-muted mb-1 block">Product Name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Custom Photo Keychain"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Price (INR) *</label>
                <input
                  type="number"
                  value={createForm.price}
                  onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })}
                  placeholder="449"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Compare Price (MRP)</label>
                <input
                  type="number"
                  value={createForm.comparePrice}
                  onChange={(e) => setCreateForm({ ...createForm, comparePrice: e.target.value })}
                  placeholder="699"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  min="1"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Category *</label>
                <select
                  value={createForm.categoryId}
                  onChange={(e) => setCreateForm({ ...createForm, categoryId: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  required
                >
                  <option value="">Select category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Status</label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as "draft" | "published" })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted mb-1 block">Image URL</label>
                <input
                  type="url"
                  value={createForm.imageUrl}
                  onChange={(e) => setCreateForm({ ...createForm, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-xs text-muted mb-1 block">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Product description..."
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending ? "Creating..." : "Create Product"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
            {createMutation.isError && (
              <p className="text-xs text-error">{createMutation.error.message}</p>
            )}
          </motion.form>
        )}
      </AnimatePresence>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {["", "draft", "published", "archived"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === status
                ? "bg-accent text-background"
                : "bg-surface text-muted border border-border"
            }`}
          >
            {status || "All"}
          </button>
        ))}
      </div>

      {/* Products Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Price</th>
                {bulkMode && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Compare Price</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-3"><div className="h-4 skeleton w-full" /></td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">No products found</td>
                </tr>
              ) : (
                products.map((product) => {
                  const cat = categories.find((c) => c.id === product.categoryId);
                  return (
                    <tr key={product.id} className="hover:bg-surface-hover/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground line-clamp-1">{product.name}</p>
                        <p className="text-xs text-muted">{product.slug}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">{cat?.name || "—"}</td>
                      <td className="px-4 py-3">
                        {bulkMode ? (
                          <input
                            type="number"
                            placeholder={product.price ? String(product.price) : "Set price"}
                            value={editingPrices[product.id]?.price || ""}
                            onChange={(e) =>
                              setEditingPrices((prev) => ({
                                ...prev,
                                [product.id]: {
                                  ...prev[product.id],
                                  price: e.target.value,
                                  comparePrice: prev[product.id]?.comparePrice || "",
                                },
                              }))
                            }
                            className="w-24 rounded border border-border bg-background px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none"
                          />
                        ) : (
                          <span className={product.price ? "text-foreground font-medium" : "text-muted italic"}>
                            {product.price ? formatPrice(product.price) : "No price"}
                          </span>
                        )}
                      </td>
                      {bulkMode && (
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            placeholder="MRP"
                            value={editingPrices[product.id]?.comparePrice || ""}
                            onChange={(e) =>
                              setEditingPrices((prev) => ({
                                ...prev,
                                [product.id]: {
                                  ...prev[product.id],
                                  price: prev[product.id]?.price || "",
                                  comparePrice: e.target.value,
                                },
                              }))
                            }
                            className="w-24 rounded border border-border bg-background px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          product.status === "published"
                            ? "bg-success/10 text-success"
                            : product.status === "archived"
                              ? "bg-error/10 text-error"
                              : "bg-warning/10 text-warning"
                        }`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {product.status === "draft" && (
                            <button onClick={() => handlePublish(product.id)} className="text-xs text-success hover:underline">
                              Publish
                            </button>
                          )}
                          {product.status === "published" && (
                            <button onClick={() => handleArchive(product.id)} className="text-xs text-error hover:underline">
                              Archive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
