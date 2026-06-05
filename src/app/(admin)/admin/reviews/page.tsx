"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface Review {
  id: string;
  productId: string;
  productName: string | null;
  productSlug: string | null;
  customerName: string;
  rating: number;
  comment: string | null;
  isApproved: boolean;
  createdAt: string;
}

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews", filter],
    queryFn: async () => {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`/api/admin/reviews${params}`);
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json() as Promise<{
        reviews: Review[];
        total: number;
        pendingCount: number;
      }>;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, isApproved }: { id: string; isApproved: boolean }) => {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved }),
      });
      if (!res.ok) throw new Error("Failed to update review");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete review");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
  });

  const reviews = data?.reviews || [];
  const pendingCount = data?.pendingCount || 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reviews</h1>
          <p className="mt-1 text-sm text-muted">
            Manage customer reviews.{" "}
            {pendingCount > 0 && (
              <span className="font-medium text-amber-600">
                {pendingCount} pending approval
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mt-6 flex gap-1 rounded-lg bg-surface p-1 w-fit">
        {(["all", "pending", "approved"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              filter === tab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="mt-6 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border p-5 space-y-3">
                <div className="h-4 w-1/4 skeleton" />
                <div className="h-4 w-3/4 skeleton" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-border p-12 text-center">
            <p className="text-muted">
              {filter === "pending"
                ? "No pending reviews."
                : filter === "approved"
                ? "No approved reviews yet."
                : "No reviews yet."}
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className={`rounded-xl border p-5 transition-colors ${
                review.isApproved
                  ? "border-border bg-background"
                  : "border-amber-200 bg-amber-50/30"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Product info */}
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>Product:</span>
                    <span className="font-medium text-foreground">
                      {review.productName || "Unknown"}
                    </span>
                    {!review.isApproved && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Pending
                      </span>
                    )}
                  </div>

                  {/* Reviewer + rating */}
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
                      <span className="text-xs font-bold text-accent">
                        {review.customerName[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {review.customerName}
                      </p>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill={star <= review.rating ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth={star <= review.rating ? 0 : 1.5}
                            className={`h-3.5 w-3.5 ${
                              star <= review.rating ? "text-amber-400" : "text-border"
                            }`}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                            />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <p className="mt-3 text-sm text-muted leading-relaxed">
                      &ldquo;{review.comment}&rdquo;
                    </p>
                  )}

                  {/* Date */}
                  <p className="mt-2 text-xs text-muted">
                    {new Date(review.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {!review.isApproved ? (
                    <button
                      onClick={() =>
                        approveMutation.mutate({ id: review.id, isApproved: true })
                      }
                      disabled={approveMutation.isPending}
                      className="rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent hover:text-background transition-colors"
                    >
                      Approve
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        approveMutation.mutate({ id: review.id, isApproved: false })
                      }
                      disabled={approveMutation.isPending}
                      className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      Unapprove
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm("Delete this review permanently?")) {
                        deleteMutation.mutate(review.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
