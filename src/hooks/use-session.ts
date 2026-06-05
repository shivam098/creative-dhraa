"use client";

import { useEffect, useState } from "react";

/**
 * Generate a unique session ID for anonymous customers.
 * Used to associate uploads with a browsing session.
 */
export function useSession() {
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    let id = localStorage.getItem("creative_dhraa_session");
    if (!id) {
      id = `sess_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      localStorage.setItem("creative_dhraa_session", id);
    }
    setSessionId(id);
  }, []);

  return { sessionId };
}
