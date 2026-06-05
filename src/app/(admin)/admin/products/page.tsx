"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "@/lib/utils/validators";

interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  comparePrice: number | null;
  status: string;
  badge: string | null;
  sortOrder: number;
  categoryId: string | null;
  customFields: Record<string, string> | null;
  personalizationFields: Array<{ label: string; placeholder: string; type: "text" | "textarea"; required: boolean }> | null;
  minImages: number;
  maxImages: number;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

const BADGE_OPTIONS = ["", "Top Seller", "New Arrival", "Best Value", "Limited Edition", "Trending"];

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [editingPrices, setEditingPrices] = useState<Record<string, { price: string; comparePrice: string }>>({});
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    price: "",
    comparePrice: "",
    categoryId: "",
    status: "published" as "draft" | "published",
    imageUrl: "",
    minImages: "0",
    maxImages: "5",
    customFields: [] as Array<{ key: string; value: string }>,
    personalizationFields: [] as Array<{ label: string; placeholder: string; type: "text" | "textarea"; required: boolean }>,
  });

  // ─── Edit Form State ────────────────────────────────────────────────
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    price: "",
    comparePrice: "",
    categoryId: "",
    status: "" as string,
    badge: "",
    sortOrder: "0",
    minImages: "0",
    maxImages: "5",
    customFields: [] as Array<{ key: string; value: string }>,
    personalizationFields: [] as Array<{ label: string; placeholder: string; type: "text" | "textarea"; required: boolean }>,
  });

  // ─── Queries ────────────────────────────────────────────────────────
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

  // ─── Mutations ──────────────────────────────────────────────────────
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
      setCreateForm({ name: "", description: "", price: "", comparePrice: "", categoryId: "", status: "published", imageUrl: "", minImages: "0", maxImages: "5", customFields: [], personalizationFields: [] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      setEditingProduct(null);
    },
  });

  const bulkPriceMutation = useMutation({
    mutationFn: async (updates: Array<{ productId: string; price?: number; comparePrice?: number }>) => {
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

  const createCategoryMutation = useMutation({
    mutationFn: async (body: { name: string; description?: string }) => {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create category");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setNewCategoryName("");
      setNewCategoryDesc("");
      setShowCategoryForm(false);
    },
  });

  const products: AdminProduct[] = data?.products || [];
  const categories = categoriesData?.categories || [];

  // ─── Handlers ───────────────────────────────────────────────────────
  const handlePublish = (id: string) => updateMutation.mutate({ id, data: { status: "published" } });
  const handleArchive = (id: string) => updateMutation.mutate({ id, data: { status: "archived" } });
  const handleUnarchive = (id: string) => updateMutation.mutate({ id, data: { status: "published" } });
  const handleDraft = (id: string) => updateMutation.mutate({ id, data: { status: "draft" } });

  const openEditModal = (product: AdminProduct) => {
    setEditingProduct(product);
    const cf = product.customFields
      ? Object.entries(product.customFields).map(([key, value]) => ({ key, value }))
      : [];
    setEditForm({
      name: product.name,
      description: product.description || "",
      price: product.price ? String(product.price) : "",
      comparePrice: product.comparePrice ? String(product.comparePrice) : "",
      categoryId: product.categoryId || "",
      status: product.status,
      badge: product.badge || "",
      sortOrder: String(product.sortOrder || 0),
      minImages: String(product.minImages || 0),
      maxImages: String(product.maxImages || 5),
      customFields: cf,
      personalizationFields: product.personalizationFields || [],
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const cfObj = editForm.customFields.reduce<Record<string, string>>((acc, { key, value }) => {
      if (key.trim()) acc[key.trim()] = value;
      return acc;
    }, {});

    updateMutation.mutate({
      id: editingProduct.id,
      data: {
        name: editForm.name || undefined,
        description: editForm.description,
        price: editForm.price ? Number(editForm.price) : undefined,
        comparePrice: editForm.comparePrice ? Number(editForm.comparePrice) : undefined,
        categoryId: editForm.categoryId || undefined,
        status: editForm.status || undefined,
        badge: editForm.badge || null,
        sortOrder: Number(editForm.sortOrder) || 0,
        minImages: Number(editForm.minImages) || 0,
        maxImages: Number(editForm.maxImages) || 5,
        customFields: Object.keys(cfObj).length > 0 ? cfObj : null,
        personalizationFields: editForm.personalizationFields.length > 0
          ? editForm.personalizationFields.filter((f) => f.label.trim())
          : null,
      },
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cfObj = createForm.customFields.reduce<Record<string, string>>((acc, { key, value }) => {
      if (key.trim()) acc[key.trim()] = value;
      return acc;
    }, {});

    createMutation.mutate({
      name: createForm.name,
      description: createForm.description || undefined,
      price: Number(createForm.price),
      comparePrice: createForm.comparePrice ? Number(createForm.comparePrice) : undefined,
      categoryId: createForm.categoryId,
      status: createForm.status,
      imageUrl: createForm.imageUrl || undefined,
      minImages: Number(createForm.minImages) || 0,
      maxImages: Number(createForm.maxImages) || 5,
      customFields: Object.keys(cfObj).length > 0 ? cfObj : undefined,
      personalizationFields: createForm.personalizationFields.length > 0
        ? createForm.personalizationFields.filter((f) => f.label.trim())
        : undefined,
    });
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    createCategoryMutation.mutate({
      name: newCategoryName,
      description: newCategoryDesc || undefined,
    });
  };

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted mt-1">
            {data?.pagination?.total || 0} total products
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryForm(!showCategoryForm)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground hover:border-accent transition-colors"
          >
            + Category
          </button>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
          >
            + Add Product
          </button>
        </div>
      </div>

      {/* Create Category Form */}
      <AnimatePresence>
        {showCategoryForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreateCategory}
            className="rounded-xl border border-border bg-surface p-4 space-y-3"
          >
            <h3 className="font-semibold text-foreground text-sm">New Category</h3>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name (e.g. Birthday Gifts)"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  required
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={createCategoryMutation.isPending}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
                >
                  {createCategoryMutation.isPending ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCategoryForm(false)}
                  className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
            {createCategoryMutation.isError && (
              <p className="text-xs text-error">{createCategoryMutation.error.message}</p>
            )}
            {/* Existing categories list */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted mb-2">Existing categories:</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <span key={c.id} className="rounded-full bg-surface-hover px-3 py-1 text-xs text-foreground border border-border">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

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
              <div>
                <label className="text-xs text-muted mb-1 block">Min Images Required</label>
                <input
                  type="number"
                  value={createForm.minImages}
                  onChange={(e) => setCreateForm({ ...createForm, minImages: e.target.value })}
                  placeholder="0"
                  min="0"
                  max="20"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Max Images Allowed</label>
                <input
                  type="number"
                  value={createForm.maxImages}
                  onChange={(e) => setCreateForm({ ...createForm, maxImages: e.target.value })}
                  placeholder="5"
                  min="1"
                  max="30"
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
              {/* Custom Fields */}
              <div className="sm:col-span-2 lg:col-span-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted">Custom Fields (e.g. Song Name, Material)</label>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, customFields: [...createForm.customFields, { key: "", value: "" }] })}
                    className="text-xs text-accent hover:underline"
                  >
                    + Add Field
                  </button>
                </div>
                {createForm.customFields.map((field, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Field name"
                      value={field.key}
                      onChange={(e) => {
                        const cf = [...createForm.customFields];
                        cf[i] = { ...cf[i], key: e.target.value };
                        setCreateForm({ ...createForm, customFields: cf });
                      }}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={field.value}
                      onChange={(e) => {
                        const cf = [...createForm.customFields];
                        cf[i] = { ...cf[i], value: e.target.value };
                        setCreateForm({ ...createForm, customFields: cf });
                      }}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cf = createForm.customFields.filter((_, idx) => idx !== i);
                        setCreateForm({ ...createForm, customFields: cf });
                      }}
                      className="text-xs text-error hover:underline px-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
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
      <div className="flex items-center justify-between">
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
        <button
          onClick={() => {
            if (bulkMode) {
              // Save bulk edits
              const updates = Object.entries(editingPrices)
                .map(([productId, { price, comparePrice }]) => {
                  const entry: { productId: string; price?: number; comparePrice?: number } = { productId };
                  if (price) entry.price = Number(price);
                  if (comparePrice) entry.comparePrice = Number(comparePrice);
                  return entry;
                })
                .filter((e) => e.price || e.comparePrice);
              if (updates.length > 0) {
                bulkPriceMutation.mutate(updates);
              } else {
                setBulkMode(false);
                setEditingPrices({});
              }
            } else {
              // Enter bulk mode, pre-fill current prices
              const initial: Record<string, { price: string; comparePrice: string }> = {};
              products.forEach((p) => {
                initial[p.id] = {
                  price: p.price ? String(p.price) : "",
                  comparePrice: p.comparePrice ? String(p.comparePrice) : "",
                };
              });
              setEditingPrices(initial);
              setBulkMode(true);
            }
          }}
          disabled={bulkPriceMutation.isPending}
          className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
            bulkMode
              ? "bg-accent text-white hover:bg-accent/90"
              : "border border-border text-muted hover:text-foreground hover:border-accent"
          }`}
        >
          {bulkPriceMutation.isPending ? "Saving..." : bulkMode ? "Save All Prices" : "Bulk Edit Prices"}
        </button>
      </div>

      {bulkMode && (
        <div className="flex items-center justify-between rounded-lg bg-accent/5 border border-accent/20 px-4 py-2">
          <p className="text-xs text-accent font-medium">Bulk edit mode: modify prices below, then click &quot;Save All Prices&quot;</p>
          <button
            onClick={() => { setBulkMode(false); setEditingPrices({}); }}
            className="text-xs text-muted hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Products Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Badge</th>
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
                        <p className="text-xs text-muted line-clamp-1">
                          {product.description ? product.description.slice(0, 60) + (product.description.length > 60 ? "..." : "") : <span className="italic">No description</span>}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">{cat?.name || "—"}</td>
                      <td className="px-4 py-3">
                        {bulkMode ? (
                          <div className="flex gap-1.5 items-center">
                            <input
                              type="number"
                              value={editingPrices[product.id]?.price || ""}
                              onChange={(e) => setEditingPrices({
                                ...editingPrices,
                                [product.id]: { ...editingPrices[product.id], price: e.target.value },
                              })}
                              placeholder="Price"
                              min="1"
                              className="w-20 rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
                            />
                            <input
                              type="number"
                              value={editingPrices[product.id]?.comparePrice || ""}
                              onChange={(e) => setEditingPrices({
                                ...editingPrices,
                                [product.id]: { ...editingPrices[product.id], comparePrice: e.target.value },
                              })}
                              placeholder="MRP"
                              min="1"
                              className="w-20 rounded border border-border bg-background px-2 py-1 text-xs text-muted focus:border-accent focus:outline-none"
                            />
                          </div>
                        ) : (
                          <>
                            <span className={product.price ? "text-foreground font-medium" : "text-muted italic"}>
                              {product.price ? formatPrice(product.price) : "No price"}
                            </span>
                            {product.comparePrice && (
                              <span className="text-xs text-muted line-through ml-1">
                                {formatPrice(product.comparePrice)}
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {product.badge ? (
                          <span className="inline-flex rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                            {product.badge}
                          </span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
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
                          <button
                            onClick={() => openEditModal(product)}
                            className="text-xs text-accent hover:underline font-medium"
                          >
                            Edit
                          </button>
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
                          {product.status === "archived" && (
                            <>
                              <button onClick={() => handleUnarchive(product.id)} className="text-xs text-success hover:underline">
                                Publish
                              </button>
                              <button onClick={() => handleDraft(product.id)} className="text-xs text-warning hover:underline">
                                Draft
                              </button>
                            </>
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

      {/* Edit Product Modal */}
      <AnimatePresence>
        {editingProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setEditingProduct(null); }}
          >
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={handleEditSubmit}
              className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-surface p-6 space-y-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Edit Product</h3>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="rounded-lg p-1 text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Name */}
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted mb-1 block">Product Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted mb-1 block">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Enter product description..."
                    rows={4}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none resize-none"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="text-xs text-muted mb-1 block">Price (INR)</label>
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    placeholder="449"
                    min="1"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                </div>

                {/* Compare Price */}
                <div>
                  <label className="text-xs text-muted mb-1 block">Compare Price (MRP)</label>
                  <input
                    type="number"
                    value={editForm.comparePrice}
                    onChange={(e) => setEditForm({ ...editForm, comparePrice: e.target.value })}
                    placeholder="699"
                    min="1"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs text-muted mb-1 block">Category</label>
                  <select
                    value={editForm.categoryId}
                    onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  >
                    <option value="">Select category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs text-muted mb-1 block">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                {/* Badge */}
                <div>
                  <label className="text-xs text-muted mb-1 block">Badge</label>
                  <select
                    value={editForm.badge}
                    onChange={(e) => setEditForm({ ...editForm, badge: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  >
                    <option value="">No badge</option>
                    {BADGE_OPTIONS.filter(Boolean).map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="text-xs text-muted mb-1 block">Sort Order</label>
                  <input
                    type="number"
                    value={editForm.sortOrder}
                    onChange={(e) => setEditForm({ ...editForm, sortOrder: e.target.value })}
                    min="0"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                  <p className="text-xs text-muted mt-0.5">Lower = appears first. Default 0.</p>
                </div>

                {/* Min Images */}
                <div>
                  <label className="text-xs text-muted mb-1 block">Min Images Required</label>
                  <input
                    type="number"
                    value={editForm.minImages}
                    onChange={(e) => setEditForm({ ...editForm, minImages: e.target.value })}
                    min="0"
                    max="20"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                  <p className="text-xs text-muted mt-0.5">Customer must upload at least this many images.</p>
                </div>

                {/* Max Images */}
                <div>
                  <label className="text-xs text-muted mb-1 block">Max Images Allowed</label>
                  <input
                    type="number"
                    value={editForm.maxImages}
                    onChange={(e) => setEditForm({ ...editForm, maxImages: e.target.value })}
                    min="1"
                    max="30"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                  <p className="text-xs text-muted mt-0.5">e.g. Photo Album = 20, Keychain = 2.</p>
                </div>
              </div>

              {/* Custom Fields */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-foreground">Custom Fields</label>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, customFields: [...editForm.customFields, { key: "", value: "" }] })}
                    className="text-xs text-accent hover:underline font-medium"
                  >
                    + Add Field
                  </button>
                </div>
                <p className="text-xs text-muted mb-3">
                  Add extra details like &quot;Song Name&quot;, &quot;Material&quot;, &quot;Size&quot;, etc. These appear on the product page.
                </p>
                {editForm.customFields.length === 0 ? (
                  <p className="text-xs text-muted italic">No custom fields. Click &quot;+ Add Field&quot; to add one.</p>
                ) : (
                  <div className="space-y-2">
                    {editForm.customFields.map((field, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Field name (e.g. Song Name)"
                          value={field.key}
                          onChange={(e) => {
                            const cf = [...editForm.customFields];
                            cf[i] = { ...cf[i], key: e.target.value };
                            setEditForm({ ...editForm, customFields: cf });
                          }}
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={field.value}
                          onChange={(e) => {
                            const cf = [...editForm.customFields];
                            cf[i] = { ...cf[i], value: e.target.value };
                            setEditForm({ ...editForm, customFields: cf });
                          }}
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const cf = editForm.customFields.filter((_, idx) => idx !== i);
                            setEditForm({ ...editForm, customFields: cf });
                          }}
                          className="rounded-lg p-1.5 text-error hover:bg-error/10 transition-colors"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Personalization Fields (Customer Input Fields) */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-foreground">Personalization Fields</label>
                  <button
                    type="button"
                    onClick={() => setEditForm({
                      ...editForm,
                      personalizationFields: [...editForm.personalizationFields, { label: "", placeholder: "", type: "text", required: false }],
                    })}
                    className="text-xs text-accent hover:underline font-medium"
                  >
                    + Add Field
                  </button>
                </div>
                <p className="text-xs text-muted mb-3">
                  These are the inputs customers fill in when ordering (e.g. &quot;Name to print&quot;, &quot;Date&quot;, &quot;Custom message&quot;).
                </p>
                {editForm.personalizationFields.length === 0 ? (
                  <p className="text-xs text-muted italic">No personalization fields. Customers won&apos;t see any text inputs on this product.</p>
                ) : (
                  <div className="space-y-3">
                    {editForm.personalizationFields.map((field, i) => (
                      <div key={i} className="rounded-lg border border-border bg-background/50 p-3 space-y-2">
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Label (e.g. Name)"
                            value={field.label}
                            onChange={(e) => {
                              const pf = [...editForm.personalizationFields];
                              pf[i] = { ...pf[i], label: e.target.value };
                              setEditForm({ ...editForm, personalizationFields: pf });
                            }}
                            className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Placeholder text"
                            value={field.placeholder}
                            onChange={(e) => {
                              const pf = [...editForm.personalizationFields];
                              pf[i] = { ...pf[i], placeholder: e.target.value };
                              setEditForm({ ...editForm, personalizationFields: pf });
                            }}
                            className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const pf = editForm.personalizationFields.filter((_, idx) => idx !== i);
                              setEditForm({ ...editForm, personalizationFields: pf });
                            }}
                            className="rounded-lg p-1.5 text-error hover:bg-error/10 transition-colors"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex gap-3 items-center">
                          <select
                            value={field.type}
                            onChange={(e) => {
                              const pf = [...editForm.personalizationFields];
                              pf[i] = { ...pf[i], type: e.target.value as "text" | "textarea" };
                              setEditForm({ ...editForm, personalizationFields: pf });
                            }}
                            className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
                          >
                            <option value="text">Short text</option>
                            <option value="textarea">Long text</option>
                          </select>
                          <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => {
                                const pf = [...editForm.personalizationFields];
                                pf[i] = { ...pf[i], required: e.target.checked };
                                setEditForm({ ...editForm, personalizationFields: pf });
                              }}
                              className="rounded border-border"
                            />
                            Required
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-border">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
              {updateMutation.isError && (
                <p className="text-xs text-error">{updateMutation.error.message}</p>
              )}
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
