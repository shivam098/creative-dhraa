"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { formatPrice } from "@/lib/utils/validators";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: "percentage" | "flat";
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  startsAt: string;
  expiresAt: string | null;
}

interface ProductDiscount {
  id: string;
  productId: string;
  productName: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  isActive: boolean;
  startsAt: string;
  expiresAt: string | null;
}

interface CategoryDiscount {
  id: string;
  categoryId: string;
  categoryName: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  isActive: boolean;
  startsAt: string;
  expiresAt: string | null;
}

interface Product {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

type Tab = "coupons" | "products" | "categories";

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminOffersPage() {
  const [tab, setTab] = useState<Tab>("coupons");
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Offers & Discounts</h1>
          <p className="text-sm text-muted mt-1">Manage coupons, product sales, and category offers</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          + Create {tab === "coupons" ? "Coupon" : tab === "products" ? "Product Sale" : "Category Offer"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-border overflow-hidden w-fit">
        {([
          { key: "coupons", label: "Coupon Codes" },
          { key: "products", label: "Product Sales" },
          { key: "categories", label: "Category Offers" },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setShowForm(false); }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-accent text-white"
                : "bg-surface text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "coupons" && <CouponsTab showForm={showForm} setShowForm={setShowForm} />}
      {tab === "products" && <ProductDiscountsTab showForm={showForm} setShowForm={setShowForm} />}
      {tab === "categories" && <CategoryDiscountsTab showForm={showForm} setShowForm={setShowForm} />}
    </div>
  );
}

// ─── Coupons Tab ──────────────────────────────────────────────────────────────

function CouponsTab({ showForm, setShowForm }: { showForm: boolean; setShowForm: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "percentage" as "percentage" | "flat",
    discountValue: "",
    minOrderAmount: "0",
    maxDiscountAmount: "",
    usageLimit: "",
    expiresAt: "",
  });

  const { data, isLoading } = useQuery<{ coupons: Coupon[] }>({
    queryKey: ["admin", "coupons"],
    queryFn: async () => {
      const res = await fetch("/api/admin/coupons");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create coupon");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      setShowForm(false);
      resetForm();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch("/api/admin/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/admin/coupons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] }),
  });

  function resetForm() {
    setFormData({
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      minOrderAmount: "0",
      maxDiscountAmount: "",
      usageLimit: "",
      expiresAt: "",
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      code: formData.code,
      description: formData.description || undefined,
      discountType: formData.discountType,
      discountValue: Number(formData.discountValue),
      minOrderAmount: Number(formData.minOrderAmount) || 0,
      maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : undefined,
      usageLimit: formData.usageLimit ? Number(formData.usageLimit) : undefined,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
    });
  }

  const coupons = data?.coupons || [];

  return (
    <div className="space-y-4">
      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="rounded-xl border border-border bg-surface p-6 space-y-4"
          >
            <h3 className="font-semibold text-foreground">New Coupon Code</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-xs text-muted mb-1 block">Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE20"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Discount Type</label>
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value as "percentage" | "flat" })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat (INR)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">
                  Value * {formData.discountType === "percentage" ? "(%)" : "(₹)"}
                </label>
                <input
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  placeholder={formData.discountType === "percentage" ? "20" : "100"}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  required
                  min="0"
                  step="any"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Min Order Amount (₹)</label>
                <input
                  type="number"
                  value={formData.minOrderAmount}
                  onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                  placeholder="0"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  min="0"
                />
              </div>
              {formData.discountType === "percentage" && (
                <div>
                  <label className="text-xs text-muted mb-1 block">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    value={formData.maxDiscountAmount}
                    onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                    placeholder="500"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                    min="0"
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-muted mb-1 block">Usage Limit</label>
                <input
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  placeholder="Unlimited"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  min="1"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Expires At</label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-xs text-muted mb-1 block">Description (optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Summer sale - 20% off on all orders"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending ? "Creating..." : "Create Coupon"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
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

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-hover">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Discount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Min Order</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Usage</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Expires</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Loading...</td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">No coupons yet. Create your first one above.</td></tr>
            ) : (
              coupons.map((c) => (
                <tr key={c.id} className="hover:bg-surface-hover/50">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-accent">{c.code}</span>
                    {c.description && <p className="text-xs text-muted mt-0.5">{c.description}</p>}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {c.discountType === "percentage" ? `${c.discountValue}%` : formatPrice(c.discountValue)}
                    {c.maxDiscountAmount && (
                      <span className="text-xs text-muted ml-1">(max {formatPrice(c.maxDiscountAmount)})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {c.minOrderAmount > 0 ? formatPrice(c.minOrderAmount) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {c.usageCount}{c.usageLimit ? `/${c.usageLimit}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleMutation.mutate({ id: c.id, isActive: !c.isActive })}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.isActive
                          ? "bg-success/10 text-success"
                          : "bg-muted/10 text-muted"
                      }`}
                    >
                      {c.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-IN") : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm("Delete this coupon?")) deleteMutation.mutate(c.id);
                      }}
                      className="text-xs text-error hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Product Discounts Tab ────────────────────────────────────────────────────

function ProductDiscountsTab({ showForm, setShowForm }: { showForm: boolean; setShowForm: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    productId: "",
    discountType: "percentage" as "percentage" | "flat",
    discountValue: "",
    expiresAt: "",
  });

  const { data: discountsData, isLoading } = useQuery<{ discounts: ProductDiscount[] }>({
    queryKey: ["admin", "discounts", "products"],
    queryFn: async () => {
      const res = await fetch("/api/admin/discounts/products");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: productsData } = useQuery<{ products: Product[] }>({
    queryKey: ["admin", "products-list"],
    queryFn: async () => {
      const res = await fetch("/api/admin/products?limit=100");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/admin/discounts/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create discount");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "discounts", "products"] });
      setShowForm(false);
      setFormData({ productId: "", discountType: "percentage", discountValue: "", expiresAt: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/admin/discounts/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "discounts", "products"] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      productId: formData.productId,
      discountType: formData.discountType,
      discountValue: Number(formData.discountValue),
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
    });
  }

  const discounts = discountsData?.discounts || [];
  const products = productsData?.products || [];

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="rounded-xl border border-border bg-surface p-6 space-y-4"
          >
            <h3 className="font-semibold text-foreground">New Product Sale</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-xs text-muted mb-1 block">Product *</label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  required
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Discount Type</label>
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value as "percentage" | "flat" })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat off (₹)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Value *</label>
                <input
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  placeholder={formData.discountType === "percentage" ? "15" : "100"}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Expires At</label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : "Create Sale"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-hover">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Product</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Discount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Expires</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Loading...</td></tr>
            ) : discounts.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No product sales yet</td></tr>
            ) : (
              discounts.map((d) => (
                <tr key={d.id} className="hover:bg-surface-hover/50">
                  <td className="px-4 py-3 font-medium text-foreground">{d.productName}</td>
                  <td className="px-4 py-3 text-accent font-medium">
                    {d.discountType === "percentage" ? `${d.discountValue}% off` : `${formatPrice(d.discountValue)} off`}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      d.isActive ? "bg-success/10 text-success" : "bg-muted/10 text-muted"
                    }`}>
                      {d.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {d.expiresAt ? new Date(d.expiresAt).toLocaleDateString("en-IN") : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { if (confirm("Remove this sale?")) deleteMutation.mutate(d.id); }}
                      className="text-xs text-error hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Category Discounts Tab ───────────────────────────────────────────────────

function CategoryDiscountsTab({ showForm, setShowForm }: { showForm: boolean; setShowForm: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    categoryId: "",
    discountType: "percentage" as "percentage" | "flat",
    discountValue: "",
    expiresAt: "",
  });

  const { data: discountsData, isLoading } = useQuery<{ discounts: CategoryDiscount[] }>({
    queryKey: ["admin", "discounts", "categories"],
    queryFn: async () => {
      const res = await fetch("/api/admin/discounts/categories");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: categoriesData } = useQuery<{ categories: Category[] }>({
    queryKey: ["admin", "categories-list"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) return { categories: [] };
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/admin/discounts/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create discount");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "discounts", "categories"] });
      setShowForm(false);
      setFormData({ categoryId: "", discountType: "percentage", discountValue: "", expiresAt: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/admin/discounts/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "discounts", "categories"] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      categoryId: formData.categoryId,
      discountType: formData.discountType,
      discountValue: Number(formData.discountValue),
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
    });
  }

  const discounts = discountsData?.discounts || [];
  const cats = categoriesData?.categories || [];

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="rounded-xl border border-border bg-surface p-6 space-y-4"
          >
            <h3 className="font-semibold text-foreground">New Category Offer</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-xs text-muted mb-1 block">Category *</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  required
                >
                  <option value="">Select category...</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Discount Type</label>
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value as "percentage" | "flat" })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat off (₹)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Value *</label>
                <input
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  placeholder="20"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Expires At</label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : "Create Offer"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-hover">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Discount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Expires</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Loading...</td></tr>
            ) : discounts.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No category offers yet</td></tr>
            ) : (
              discounts.map((d) => (
                <tr key={d.id} className="hover:bg-surface-hover/50">
                  <td className="px-4 py-3 font-medium text-foreground">{d.categoryName}</td>
                  <td className="px-4 py-3 text-accent font-medium">
                    {d.discountType === "percentage" ? `${d.discountValue}% off` : `${formatPrice(d.discountValue)} off`}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      d.isActive ? "bg-success/10 text-success" : "bg-muted/10 text-muted"
                    }`}>
                      {d.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {d.expiresAt ? new Date(d.expiresAt).toLocaleDateString("en-IN") : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { if (confirm("Remove this offer?")) deleteMutation.mutate(d.id); }}
                      className="text-xs text-error hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
