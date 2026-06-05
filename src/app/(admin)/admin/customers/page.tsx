"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  source: string;
  tags: string[];
  notes: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  createdAt: string;
}

interface ImportantDate {
  id: string;
  type: string;
  label: string;
  date: string;
  recipientName: string | null;
  reminderDaysBefore: number;
  isRecurring: boolean;
}

export default function AdminCustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", phone: "", city: "", notes: "" });
  const [dateForm, setDateForm] = useState({
    type: "birthday" as "birthday" | "anniversary" | "custom",
    label: "",
    date: "",
    recipientName: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "customers", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/customers?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<{ customers: Customer[]; pagination: { total: number } }>;
    },
  });

  const { data: customerDetail } = useQuery({
    queryKey: ["admin", "customer", selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return null;
      const res = await fetch(`/api/admin/customers/${selectedCustomer.id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<{ customer: Customer; importantDates: ImportantDate[] }>;
    },
    enabled: !!selectedCustomer,
  });

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
      setShowAddForm(false);
      setAddForm({ name: "", email: "", phone: "", city: "", notes: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "customer"] });
    },
  });

  const customers = data?.customers || [];
  const total = data?.pagination?.total || 0;
  const importantDates = customerDetail?.importantDates || [];

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name: addForm.name,
      email: addForm.email || undefined,
      phone: addForm.phone || undefined,
      city: addForm.city || undefined,
      notes: addForm.notes || undefined,
    });
  };

  const handleAddDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const newDates = [
      ...importantDates.map((d) => ({
        type: d.type as "birthday" | "anniversary" | "custom",
        label: d.label,
        date: d.date,
        recipientName: d.recipientName || undefined,
        isRecurring: d.isRecurring,
      })),
      {
        type: dateForm.type,
        label: dateForm.label,
        date: new Date(dateForm.date).toISOString(),
        recipientName: dateForm.recipientName || undefined,
        isRecurring: true,
      },
    ];

    updateMutation.mutate({
      id: selectedCustomer.id,
      data: { importantDates: newDates },
    });
    setDateForm({ type: "birthday", label: "", date: "", recipientName: "" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted mt-1">{total} profiles collected</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent-hover transition-colors"
        >
          + Add Customer
        </button>
      </div>

      {/* Add Customer Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleAddCustomer}
            className="overflow-hidden rounded-xl border border-border bg-surface p-6 space-y-4"
          >
            <h3 className="font-medium text-foreground">New Customer Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Name *"
                required
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
              />
              <input
                type="email"
                placeholder="Email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
              />
              <input
                type="text"
                placeholder="City"
                value={addForm.city}
                onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
              />
            </div>
            <textarea
              placeholder="Notes (admin only)"
              rows={2}
              value={addForm.notes}
              onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm resize-none"
            />
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent-hover disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create Profile"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name, email, or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-2 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 rounded-xl border border-border bg-surface animate-pulse" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12 text-muted">
              <p>No customers found.</p>
              <p className="text-xs mt-1">Profiles are created automatically when orders are placed.</p>
            </div>
          ) : (
            customers.map((customer) => (
              <motion.div
                key={customer.id}
                onClick={() => setSelectedCustomer(customer)}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  selectedCustomer?.id === customer.id
                    ? "border-accent bg-accent/5"
                    : "border-border bg-surface hover:border-accent/30"
                }`}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">{customer.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                      {customer.email && <span>{customer.email}</span>}
                      {customer.phone && <span>{customer.phone}</span>}
                      {customer.city && <span>{customer.city}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {customer.totalOrders} order{customer.totalOrders !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted">
                      {customer.totalSpent > 0 ? `₹${customer.totalSpent.toLocaleString()}` : "—"}
                    </p>
                  </div>
                </div>
                {customer.tags && customer.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {customer.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* Customer Detail Panel */}
        <div className="lg:col-span-1">
          {selectedCustomer ? (
            <div className="sticky top-4 rounded-xl border border-border bg-surface p-5 space-y-5">
              <div>
                <h3 className="font-bold text-lg text-foreground">{selectedCustomer.name}</h3>
                <p className="text-xs text-muted mt-0.5">
                  Source: {selectedCustomer.source} | Since{" "}
                  {new Date(selectedCustomer.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-background p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{selectedCustomer.totalOrders}</p>
                  <p className="text-[10px] text-muted uppercase tracking-wide">Orders</p>
                </div>
                <div className="rounded-lg bg-background p-3 text-center">
                  <p className="text-lg font-bold text-foreground">
                    ₹{selectedCustomer.totalSpent.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted uppercase tracking-wide">Spent</p>
                </div>
              </div>

              {selectedCustomer.notes && (
                <div className="rounded-lg bg-background p-3">
                  <p className="text-xs text-muted uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-foreground">{selectedCustomer.notes}</p>
                </div>
              )}

              {/* Important Dates */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Important Dates</h4>
                {importantDates.length === 0 ? (
                  <p className="text-xs text-muted">No dates recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {importantDates.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between rounded-lg bg-background p-2.5"
                      >
                        <div>
                          <p className="text-sm text-foreground">{d.label}</p>
                          <p className="text-xs text-muted">
                            {new Date(d.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                            {d.recipientName && ` • for ${d.recipientName}`}
                          </p>
                        </div>
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent capitalize">
                          {d.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Date Form */}
                <form onSubmit={handleAddDate} className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={dateForm.type}
                      onChange={(e) =>
                        setDateForm({ ...dateForm, type: e.target.value as "birthday" | "anniversary" | "custom" })
                      }
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                    >
                      <option value="birthday">Birthday</option>
                      <option value="anniversary">Anniversary</option>
                      <option value="custom">Custom</option>
                    </select>
                    <input
                      type="date"
                      value={dateForm.date}
                      onChange={(e) => setDateForm({ ...dateForm, date: e.target.value })}
                      required
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Label (e.g., Wife's Birthday)"
                    value={dateForm.label}
                    onChange={(e) => setDateForm({ ...dateForm, label: e.target.value })}
                    required
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Recipient name (optional)"
                    value={dateForm.recipientName}
                    onChange={(e) => setDateForm({ ...dateForm, recipientName: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="w-full rounded-lg bg-accent/10 border border-accent/30 py-1.5 text-xs font-medium text-accent hover:bg-accent hover:text-background transition-all"
                  >
                    + Add Date
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
              Select a customer to view details and manage important dates.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
