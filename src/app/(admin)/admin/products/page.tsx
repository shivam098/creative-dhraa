"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/utils/validators";

interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  comparePrice: number | null;
  status: string;
  createdAt: string;
}

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [editingPrices, setEditingPrices] = useState<Record<string, { price: string; comparePrice: string }>>({});
  const [bulkMode, setBulkMode] = useState(false);

  const { data, isLoading, error } = useQuery({
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

  const handlePublish = (id: string) => {
    updateMutation.mutate({ id, data: { status: "published" } });
  };

  const handleArchive = (id: string) => {
    updateMutation.mutate({ id, data: { status: "archived" } });
  };

  const handleSaveBulkPrices = () => {
    const updates = Object.entries(editingPrices)
      .filter(([_, val]) => val.price)
      .map(([productId, val]) => ({
        productId,
        price: Number(val.price),
        comparePrice: val.comparePrice ? Number(val.comparePrice) : undefined,
      }));

    if (updates.length > 0) {
      bulkPriceMutation.mutate(updates);
    }
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
                    <td colSpan={5} className="px-4 py-3"><div className="h-4 skeleton w-full" /></td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">No products found</td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-surface-hover/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground line-clamp-1">{product.name}</p>
                      <p className="text-xs text-muted">{product.slug}</p>
                    </td>
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
                        <span className={product.price ? "text-foreground" : "text-muted italic"}>
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
                          <button
                            onClick={() => handlePublish(product.id)}
                            className="text-xs text-success hover:underline"
                          >
                            Publish
                          </button>
                        )}
                        {product.status === "published" && (
                          <button
                            onClick={() => handleArchive(product.id)}
                            className="text-xs text-error hover:underline"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
