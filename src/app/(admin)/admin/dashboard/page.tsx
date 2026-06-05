"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState, useCallback } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatPrice } from "@/lib/utils/validators";

type Period = "daily" | "weekly" | "monthly";

interface AnalyticsData {
  period: string;
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    revenueChange: number;
    ordersChange: number;
    previousRevenue: number;
    previousOrders: number;
  };
  revenueTrend: { date: string; revenue: number; orders: number }[];
  topProducts: {
    productId: string;
    productName: string;
    categoryName: string;
    totalQuantity: number;
    totalRevenue: number;
    orderCount: number;
  }[];
  decliningProducts: {
    productId: string;
    productName: string;
    currentQuantity: number;
    previousQuantity: number;
    changePercent: number;
  }[];
  categoryBreakdown: { category: string; revenue: number; quantity: number }[];
}

const COLORS = ["#6B8F71", "#8FB996", "#A3C9A8", "#B5D6B2", "#D4E9D7", "#E8F4E9"];

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<Period>("daily");

  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ["admin", "analytics", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics?period=${period}`);
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Failed to fetch analytics: ${res.status} ${body}`);
      }
      return res.json();
    },
  });

  const exportCSV = useCallback(() => {
    if (!data) return;

    const lines: string[] = [];
    
    // Summary
    lines.push("=== SUMMARY ===");
    lines.push(`Period,${data.period}`);
    lines.push(`Total Revenue,${data.summary.totalRevenue}`);
    lines.push(`Total Orders,${data.summary.totalOrders}`);
    lines.push(`Avg Order Value,${data.summary.avgOrderValue}`);
    lines.push(`Revenue Change %,${data.summary.revenueChange}`);
    lines.push(`Orders Change %,${data.summary.ordersChange}`);
    lines.push("");

    // Revenue Trend
    lines.push("=== REVENUE TREND ===");
    lines.push("Date,Revenue,Orders");
    data.revenueTrend.forEach((r) => {
      lines.push(`${r.date},${r.revenue},${r.orders}`);
    });
    lines.push("");

    // Top Products
    lines.push("=== TOP PRODUCTS ===");
    lines.push("Product,Category,Quantity Sold,Revenue,Orders");
    data.topProducts.forEach((p) => {
      lines.push(`"${p.productName}","${p.categoryName}",${p.totalQuantity},${p.totalRevenue},${p.orderCount}`);
    });
    lines.push("");

    // Declining Products
    lines.push("=== DECLINING PRODUCTS ===");
    lines.push("Product,Current Qty,Previous Qty,Change %");
    data.decliningProducts.forEach((p) => {
      lines.push(`"${p.productName}",${p.currentQuantity},${p.previousQuantity},${p.changePercent}`);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `creative-dhraa-analytics-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, period]);

  const exportPDF = useCallback(async () => {
    if (!data) return;

    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(18);
    doc.text("Creative Dhraa - Analytics Report", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Period: ${period} | Generated: ${new Date().toLocaleDateString("en-IN")}`, pageWidth / 2, 28, { align: "center" });

    // Summary
    doc.setFontSize(14);
    doc.text("Summary", 14, 40);
    
    autoTable(doc, {
      startY: 45,
      head: [["Metric", "Current", "Change"]],
      body: [
        ["Revenue", formatPrice(data.summary.totalRevenue), `${data.summary.revenueChange >= 0 ? "+" : ""}${data.summary.revenueChange}%`],
        ["Orders", String(data.summary.totalOrders), `${data.summary.ordersChange >= 0 ? "+" : ""}${data.summary.ordersChange}%`],
        ["Avg Order Value", formatPrice(data.summary.avgOrderValue), "-"],
      ],
      theme: "grid",
      headStyles: { fillColor: [107, 143, 113] },
    });

    // Top Products
    const y1 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text("Top Products", 14, y1);

    autoTable(doc, {
      startY: y1 + 5,
      head: [["Product", "Category", "Qty Sold", "Revenue"]],
      body: data.topProducts.map((p) => [
        p.productName,
        p.categoryName || "-",
        String(p.totalQuantity),
        formatPrice(p.totalRevenue),
      ]),
      theme: "grid",
      headStyles: { fillColor: [107, 143, 113] },
    });

    // Declining Products
    const y2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text("Declining Products", 14, y2);

    if (data.decliningProducts.length > 0) {
      autoTable(doc, {
        startY: y2 + 5,
        head: [["Product", "Current Qty", "Previous Qty", "Change"]],
        body: data.decliningProducts.map((p) => [
          p.productName,
          String(p.currentQuantity),
          String(p.previousQuantity),
          `${p.changePercent}%`,
        ]),
        theme: "grid",
        headStyles: { fillColor: [107, 143, 113] },
      });
    } else {
      doc.setFontSize(10);
      doc.text("No declining products in this period.", 14, y2 + 10);
    }

    doc.save(`creative-dhraa-analytics-${period}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [data, period]);

  const summary = data?.summary;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-sm text-muted mt-1">Track performance and trends</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  period === p
                    ? "bg-accent text-white"
                    : "bg-surface text-muted hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {/* Export buttons */}
          <button
            onClick={exportCSV}
            disabled={!data}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground disabled:opacity-50 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={exportPDF}
            disabled={!data}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground disabled:opacity-50 transition-colors"
          >
            Export PDF
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-800">Failed to load analytics</p>
          <p className="mt-1 text-xs text-red-600">{(error as Error).message}</p>
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Revenue",
                value: formatPrice(summary!.totalRevenue),
                change: summary!.revenueChange,
                subtext: `vs ${formatPrice(summary!.previousRevenue)} prev`,
              },
              {
                label: "Orders",
                value: String(summary!.totalOrders),
                change: summary!.ordersChange,
                subtext: `vs ${summary!.previousOrders} prev`,
              },
              {
                label: "Avg Order Value",
                value: formatPrice(summary!.avgOrderValue),
                change: null,
                subtext: "per order",
              },
              {
                label: "Top Product",
                value: data.topProducts[0]?.productName || "—",
                change: null,
                subtext: data.topProducts[0]
                  ? `${data.topProducts[0].totalQuantity} sold`
                  : "No sales yet",
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-surface p-5"
              >
                <p className="text-sm text-muted">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground truncate">
                  {stat.value}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  {stat.change !== null && (
                    <span
                      className={`text-xs font-medium ${
                        stat.change >= 0 ? "text-success" : "text-error"
                      }`}
                    >
                      {stat.change >= 0 ? "+" : ""}
                      {stat.change}%
                    </span>
                  )}
                  <span className="text-xs text-muted">{stat.subtext}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Revenue Trend Chart */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="font-semibold text-foreground mb-4">Revenue Trend</h2>
            {data.revenueTrend.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-muted text-sm">
                No order data in this period yet
              </div>
            ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--color-muted)" }}
                    tickFormatter={(v) => {
                      if (period === "daily") return v.slice(5); // MM-DD
                      if (period === "weekly") return `W${v.split("-")[1]}`;
                      return v.slice(0, 7); // YYYY-MM
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted)" }}
                    tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [formatPrice(Number(value)), "Revenue"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6B8F71"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#6B8F71" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            )}
          </div>

          {/* Orders Trend + Category Pie */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Orders trend */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="font-semibold text-foreground mb-4">Orders Trend</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "var(--color-muted)" }}
                      tickFormatter={(v) => {
                        if (period === "daily") return v.slice(8); // DD
                        if (period === "weekly") return `W${v.split("-")[1]}`;
                        return v.slice(5); // MM
                      }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "var(--color-muted)" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="orders" fill="#6B8F71" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category breakdown pie */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="font-semibold text-foreground mb-4">Revenue by Category</h2>
              {data.categoryBreakdown.length > 0 ? (
                <div className="h-56 flex items-center">
                  <ResponsiveContainer width="50%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.categoryBreakdown}
                        dataKey="revenue"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        strokeWidth={2}
                        stroke="var(--color-surface)"
                      >
                        {data.categoryBreakdown.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                    formatter={(value) => [formatPrice(Number(value)), "Revenue"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {data.categoryBreakdown.map((cat, idx) => (
                      <div key={cat.category} className="flex items-center gap-2 text-sm">
                        <div
                          className="h-3 w-3 rounded-sm"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <span className="text-muted flex-1 truncate">{cat.category}</span>
                        <span className="font-medium text-foreground">{formatPrice(cat.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted py-10 text-center">No category data yet</p>
              )}
            </div>
          </div>

          {/* Top Products + Declining Products */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top products table */}
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Top Products</h2>
                <p className="text-xs text-muted mt-0.5">By quantity sold</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-hover">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted uppercase">#</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted uppercase">Product</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted uppercase">Qty</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted uppercase">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.topProducts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                          No sales data yet
                        </td>
                      </tr>
                    ) : (
                      data.topProducts.map((p, i) => (
                        <tr key={p.productId} className="hover:bg-surface-hover/50">
                          <td className="px-4 py-2.5 text-muted">{i + 1}</td>
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-foreground truncate max-w-[180px]">{p.productName}</p>
                            <p className="text-xs text-muted">{p.categoryName || "—"}</p>
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-foreground">{p.totalQuantity}</td>
                          <td className="px-4 py-2.5 text-right text-accent font-medium">{formatPrice(p.totalRevenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Declining products table */}
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Declining Products</h2>
                <p className="text-xs text-muted mt-0.5">Lost customers vs previous period</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-hover">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted uppercase">Product</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted uppercase">Now</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted uppercase">Before</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted uppercase">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.decliningProducts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                          No declining products — great!
                        </td>
                      </tr>
                    ) : (
                      data.decliningProducts.map((p) => (
                        <tr key={p.productId} className="hover:bg-surface-hover/50">
                          <td className="px-4 py-2.5 font-medium text-foreground truncate max-w-[180px]">
                            {p.productName}
                          </td>
                          <td className="px-4 py-2.5 text-right text-muted">{p.currentQuantity}</td>
                          <td className="px-4 py-2.5 text-right text-muted">{p.previousQuantity}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="inline-flex items-center rounded-full bg-error/10 px-2 py-0.5 text-xs font-medium text-error">
                              {p.changePercent}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
