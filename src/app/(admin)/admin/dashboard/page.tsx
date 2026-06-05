"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/utils/validators";

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  totalProducts: number;
  draftProducts: number;
  publishedProducts: number;
}

export default function AdminDashboardPage() {
  const { data: ordersData } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const res = await fetch("/api/admin/orders?limit=5");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const res = await fetch("/api/admin/products?limit=5");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const recentOrders = ordersData?.orders || [];
  const totalOrders = ordersData?.pagination?.total || 0;
  const totalProducts = productsData?.pagination?.total || 0;

  const totalRevenue = recentOrders.reduce(
    (sum: number, o: { total: number; paymentStatus: string }) =>
      o.paymentStatus === "paid" ? sum + o.total : sum,
    0
  );

  const stats = [
    { label: "Total Orders", value: totalOrders, color: "text-foreground" },
    { label: "Revenue", value: formatPrice(totalRevenue), color: "text-accent" },
    { label: "Products", value: totalProducts, color: "text-foreground" },
    {
      label: "Pending",
      value: recentOrders.filter((o: { status: string }) => o.status === "pending").length,
      color: "text-warning",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted mt-1">Welcome back to Creative Dhraa admin</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-xl border border-border bg-surface p-5"
          >
            <p className="text-sm text-muted">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Recent Orders</h2>
          <a href="/admin/orders" className="text-xs text-accent hover:underline">
            View all
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Payment</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted">
                    No orders yet
                  </td>
                </tr>
              ) : (
                recentOrders.map((order: {
                  id: string;
                  orderNumber: string;
                  customerName: string;
                  status: string;
                  paymentStatus: string;
                  total: number;
                }) => (
                  <tr key={order.id} className="hover:bg-surface-hover/50">
                    <td className="px-6 py-3 font-medium text-foreground">{order.orderNumber}</td>
                    <td className="px-6 py-3 text-muted">{order.customerName}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        order.status === "delivered"
                          ? "bg-success/10 text-success"
                          : order.status === "processing"
                            ? "bg-accent/10 text-accent"
                            : order.status === "cancelled"
                              ? "bg-error/10 text-error"
                              : "bg-warning/10 text-warning"
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-xs ${order.paymentStatus === "paid" ? "text-success" : "text-warning"}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-foreground">
                      {formatPrice(order.total)}
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
