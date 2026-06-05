"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTrackEvent } from "@/hooks/use-track-event";

/**
 * Invisible component that tracks page views on route changes.
 * Drop this into a layout to automatically track all navigation.
 */
export default function TrackPageView() {
  const pathname = usePathname();
  const { track } = useTrackEvent();

  useEffect(() => {
    track("page_view", { page: pathname });
  }, [pathname, track]);

  return null;
}
