"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatPrice } from "@/lib/utils/validators";
import { useState } from "react";

interface OrderItem {
  id: string;
  productId: string;
  productName: string | null;
  variantId: string | null;
  templateId: string | null;
  quantity: number;
  unitPrice: number;
  customization: Record<string, unknown> | null;
}

interface ShippingAddress {
  fullName?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: ShippingAddress;
  status: string;
  paymentStatus: string;
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
  notes: string | null;
  createdAt: string;
}

interface OrderDetail {
  order: Order & { items: OrderItem[] };
}

const STATUS_OPTIONS = ["pending", "processing", "shipped", "delivered", "cancelled"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const PAYMENT_COLORS: Record<string, string> = {
  paid: "text-green-600",
  pending: "text-amber-600",
  failed: "text-red-600",
  refunded: "text-gray-600",
};

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Fetch orders list
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "50");
      const res = await fetch(`/api/admin/orders?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  // Fetch expanded order details
  const { data: orderDetail, isLoading: detailLoading } = useQuery<OrderDetail>({
    queryKey: ["admin", "order-detail", expandedOrderId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/orders/${expandedOrderId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!expandedOrderId,
  });

  // Update order status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "order-detail"] });
    },
  });

  const orders: Order[] = data?.orders || [];

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Orders</h1>
        <p className="text-sm text-muted mt-1">
          {data?.pagination?.total || 0} total orders
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {["", ...STATUS_OPTIONS].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === status
                ? "bg-accent text-background"
                : "bg-surface text-muted border border-border hover:bg-surface-hover"
            }`}
          >
            {status || "All"}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-4">
              <div className="h-5 skeleton w-full rounded" />
            </div>
          ))
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
            No orders found
          </div>
        ) : (
          orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            return (
              <div
                key={order.id}
                className="rounded-xl border border-border bg-surface overflow-hidden transition-shadow hover:shadow-sm"
              >
                {/* Order Row Header */}
                <button
                  onClick={() => toggleExpand(order.id)}
                  className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-surface-hover/50 transition-colors"
                >
                  {/* Expand indicator */}
                  <svg
                    className={`w-4 h-4 text-muted flex-shrink-0 transition-transform duration-200 ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>

                  {/* Order number */}
                  <div className="min-w-[100px]">
                    <p className="text-sm font-semibold text-foreground">{order.orderNumber}</p>
                    <p className="text-xs text-muted">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Customer */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{order.customerName}</p>
                    <p className="text-xs text-muted truncate">{order.customerPhone}</p>
                  </div>

                  {/* Payment status */}
                  <span className={`text-xs font-medium ${PAYMENT_COLORS[order.paymentStatus] || "text-muted"}`}>
                    {order.paymentStatus}
                  </span>

                  {/* Order status badge */}
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {order.status}
                  </span>

                  {/* Total */}
                  <span className="text-sm font-semibold text-accent min-w-[80px] text-right">
                    {formatPrice(order.total)}
                  </span>
                </button>

                {/* Expanded Detail Panel */}
                {isExpanded && (
                  <div className="border-t border-border px-5 py-5 bg-background/50">
                    {detailLoading ? (
                      <div className="space-y-3">
                        <div className="h-4 skeleton w-2/3 rounded" />
                        <div className="h-4 skeleton w-1/2 rounded" />
                        <div className="h-4 skeleton w-1/3 rounded" />
                      </div>
                    ) : orderDetail?.order ? (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Column 1: Items */}
                        <div className="lg:col-span-2 space-y-4">
                          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                            Items
                          </h3>
                          <div className="rounded-lg border border-border overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-surface-hover">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-muted">Product</th>
                                  <th className="px-3 py-2 text-center text-xs font-medium text-muted">Qty</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-muted">Price</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-muted">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {orderDetail.order.items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="px-3 py-2.5">
                                      <p className="text-foreground font-medium">
                                        {item.productName || "Unknown Product"}
                                      </p>
                                      {item.customization && (
                                        <p className="text-xs text-muted mt-0.5">
                                          Customized
                                        </p>
                                      )}
                                    </td>
                                    <td className="px-3 py-2.5 text-center text-muted">
                                      {item.quantity}
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-muted">
                                      {formatPrice(item.unitPrice)}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-medium text-foreground">
                                      {formatPrice(item.unitPrice * item.quantity)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Price Breakdown */}
                          <div className="rounded-lg border border-border p-3 space-y-1.5">
                            <div className="flex justify-between text-sm text-muted">
                              <span>Subtotal</span>
                              <span>{formatPrice(orderDetail.order.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-muted">
                              <span>Shipping</span>
                              <span>
                                {orderDetail.order.shippingCost > 0
                                  ? formatPrice(orderDetail.order.shippingCost)
                                  : "Free"}
                              </span>
                            </div>
                            {orderDetail.order.discountAmount > 0 && (
                              <div className="flex justify-between text-sm text-green-600">
                                <span>Discount</span>
                                <span>-{formatPrice(orderDetail.order.discountAmount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm font-semibold text-foreground border-t border-border pt-1.5">
                              <span>Total</span>
                              <span>{formatPrice(orderDetail.order.total)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Column 2: Shipping & Actions */}
                        <div className="space-y-5">
                          {/* Shipping Address */}
                          <div>
                            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
                              Shipping Address
                            </h3>
                            <div className="rounded-lg border border-border p-3 text-sm text-muted space-y-1">
                              {order.shippingAddress ? (
                                <>
                                  <p className="text-foreground font-medium">
                                    {(order.shippingAddress as ShippingAddress).fullName || order.customerName}
                                  </p>
                                  <p>{(order.shippingAddress as ShippingAddress).address}</p>
                                  <p>
                                    {(order.shippingAddress as ShippingAddress).city}
                                    {(order.shippingAddress as ShippingAddress).state &&
                                      `, ${(order.shippingAddress as ShippingAddress).state}`}
                                    {(order.shippingAddress as ShippingAddress).pincode &&
                                      ` - ${(order.shippingAddress as ShippingAddress).pincode}`}
                                  </p>
                                  {(order.shippingAddress as ShippingAddress).phone && (
                                    <p>Phone: {(order.shippingAddress as ShippingAddress).phone}</p>
                                  )}
                                </>
                              ) : (
                                <p>No address provided</p>
                              )}
                            </div>
                          </div>

                          {/* Customer Info */}
                          <div>
                            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
                              Customer
                            </h3>
                            <div className="rounded-lg border border-border p-3 text-sm space-y-1">
                              <p className="text-foreground">{order.customerName}</p>
                              <p className="text-muted">{order.customerEmail}</p>
                              <p className="text-muted">{order.customerPhone}</p>
                            </div>
                          </div>

                          {/* Notes */}
                          {order.notes && (
                            <div>
                              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
                                Notes
                              </h3>
                              <div className="rounded-lg border border-border p-3 text-sm text-muted">
                                {order.notes}
                              </div>
                            </div>
                          )}

                          {/* Update Status */}
                          <div>
                            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
                              Update Status
                            </h3>
                            <select
                              value={order.status}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateStatusMutation.mutate({
                                  id: order.id,
                                  status: e.target.value,
                                });
                              }}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted">Failed to load order details</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
