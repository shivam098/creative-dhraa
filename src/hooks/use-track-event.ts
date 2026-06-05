"use client";

import { useCallback, useRef } from "react";
import { useSession } from "./use-session";

type EventType =
  | "page_view"
  | "product_view"
  | "add_to_cart"
  | "remove_from_cart"
  | "checkout_start"
  | "checkout_complete"
  | "search"
  | "category_view"
  | "wishlist_add"
  | "remind_me";

interface TrackOptions {
  metadata?: Record<string, unknown>;
  page?: string;
}

/**
 * Client-side event tracking hook.
 * Fires events to /api/events for funnel analytics.
 * Debounces page_view to avoid duplicates on fast navigation.
 */
export function useTrackEvent() {
  const { sessionId } = useSession();
  const lastPageView = useRef<string>("");

  const track = useCallback(
    (eventType: EventType, options: TrackOptions = {}) => {
      if (!sessionId) return;

      // Debounce duplicate page views
      if (eventType === "page_view") {
        const page = options.page || window.location.pathname;
        if (lastPageView.current === page) return;
        lastPageView.current = page;
      }

      const payload = {
        sessionId,
        eventType,
        metadata: options.metadata || undefined,
        page: options.page || window.location.pathname,
        referrer: document.referrer || undefined,
      };

      // Use sendBeacon for reliability (doesn't block navigation)
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/events", JSON.stringify(payload));
      } else {
        fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {
          // Silently fail — analytics should never block UX
        });
      }
    },
    [sessionId]
  );

  return { track };
}
