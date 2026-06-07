"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useTrackEvent } from "@/hooks/use-track-event";
import Link from "next/link";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function ProfilePage() {
  const { user, isLoading, setUser, setLoading, logout } = useAuthStore();
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const { track } = useTrackEvent();

  // Fetch current user on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user || null);
        if (data.user) {
          setName(data.user.name || "");
          setPhone(data.user.phone || "");
        }
      })
      .catch(() => setLoading(false));
  }, [setUser, setLoading]);

  // Load Google Sign-In SDK
  useEffect(() => {
    if (user) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId || !window.google) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleSignIn,
      });

      const buttonEl = document.getElementById("google-signin-btn");
      if (buttonEl) {
        window.google.accounts.id.renderButton(buttonEl, {
          theme: "outline",
          size: "large",
          width: 300,
          text: "continue_with",
          shape: "pill",
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [user]);

  async function handleGoogleSignIn(response: { credential: string }) {
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        setName(data.user.name || "");
        setPhone(data.user.phone || "");
        track("page_view", { metadata: { action: "google_login_success" } });
      }
    } catch (error) {
      console.error("Google sign-in failed:", error);
    }
  }

  async function handleSaveProfile() {
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (data.user) {
        setUser({ ...user!, ...data.user });
        setEditMode(false);
      }
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in - show sign in
  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full text-center"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-accent">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>

          <h1 className="font-[family-name:var(--font-playfair)] text-2xl sm:text-3xl font-light mb-3">
            Welcome to Creative Dhraa
          </h1>
          <p className="text-muted text-sm mb-8 leading-relaxed">
            Sign in to track orders, save your wishlist, and get personalized recommendations.
          </p>

          {/* Google Sign In Button */}
          <div className="flex justify-center mb-6">
            <div id="google-signin-btn" />
          </div>

          <p className="text-xs text-muted-light mt-6">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </motion.div>
      </div>
    );
  }

  // Logged in - show profile
  return (
    <div className="min-h-[60vh] max-w-2xl mx-auto px-4 py-12 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-[family-name:var(--font-playfair)] text-2xl sm:text-3xl font-light">
            My Profile
          </h1>
          <button
            onClick={logout}
            className="text-sm text-muted hover:text-error transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Profile Card */}
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-6">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-accent/10 flex items-center justify-center">
                <span className="text-xl font-medium text-accent">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-lg font-medium">{user.name}</h2>
              <p className="text-sm text-muted">{user.email}</p>
            </div>
          </div>

          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-full bg-foreground text-white text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="px-6 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-surface-hover transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-border-light">
                <span className="text-sm text-muted">Phone</span>
                <span className="text-sm">{user.phone || "Not added"}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border-light">
                <span className="text-sm text-muted">Sign-in method</span>
                <span className="text-sm capitalize">{user.provider || "Google"}</span>
              </div>
              <button
                onClick={() => setEditMode(true)}
                className="mt-4 px-6 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-surface-hover transition-colors"
              >
                Edit Profile
              </button>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/wishlist"
            className="p-5 rounded-2xl border border-border hover:border-accent/30 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-accent">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium group-hover:text-accent transition-colors">My Wishlist</h3>
                <p className="text-xs text-muted">Saved items</p>
              </div>
            </div>
          </Link>

          <Link
            href="/track"
            className="p-5 rounded-2xl border border-border hover:border-accent/30 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gold-dark">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium group-hover:text-accent transition-colors">Track Orders</h3>
                <p className="text-xs text-muted">Order status</p>
              </div>
            </div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
