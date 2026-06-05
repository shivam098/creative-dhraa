"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import TextReveal from "@/components/animations/text-reveal";
import ScrollReveal from "@/components/animations/scroll-reveal";
import StaggerGrid from "@/components/animations/stagger-grid";
import Magnetic from "@/components/animations/magnetic";
import Marquee from "@/components/animations/marquee";
import TiltCard from "@/components/animations/tilt-card";
import ProductCard from "@/components/store/product-card";

const categories = [
  {
    name: "Keychains",
    slug: "keychains",
    description: "Custom photo keychains",
    image: "/images/categories/keychains.jpg",
  },
  {
    name: "Photo Gifts",
    slug: "photo-gifts",
    description: "Albums, frames & prints",
    image: "/images/categories/photo-gifts.jpg",
  },
  {
    name: "Small Gifts",
    slug: "small-gifts",
    description: "Magnets, bookmarks & more",
    image: "/images/categories/small-gifts.jpg",
  },
  {
    name: "Customised Gifts",
    slug: "customised-gifts",
    description: "Unique personalized items",
    image: "/images/categories/customised-gifts.jpg",
  },
];

const steps = [
  { step: "01", title: "Pick a Design", description: "Browse our curated collection and choose a template that resonates with your story." },
  { step: "02", title: "Upload & Personalize", description: "Add your favorite photos, names, dates, or messages to make it truly yours." },
  { step: "03", title: "We Handcraft It", description: "Our artisans carefully create your gift and deliver it to your doorstep." },
];

const marqueeItems = [
  "Keychains",
  "Photo Albums",
  "Custom Prints",
  "Fridge Magnets",
  "Bookmarks",
  "Combos",
  "Frames",
  "Resin Art",
];

// ─── Hero Background Video ────────────────────────────────────────────────────
function HeroBackground() {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const handleCanPlay = useCallback(() => setVideoLoaded(true), []);
  const handleError = useCallback(() => setVideoError(true), []);

  return (
    <div className="absolute inset-0">
      {/* Video layer */}
      {!videoError && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={handleCanPlay}
          onError={handleError}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[2000ms] ${
            videoLoaded ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src="/video/hero.webm" type="video/webm" />
          <source src="/video/hero.mp4" type="video/mp4" />
        </video>
      )}

      {/* Animated fallback — shows when video hasn't loaded or errored */}
      <AnimatePresence>
        {(!videoLoaded || videoError) && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            <HeroVisual />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Single unified overlay for readability — subtle enough to see video */}
      <div className="absolute inset-0 bg-background/60" />
      {/* Soft vignette that fades edges into the background color */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(250,250,248,0.85)_75%)]" />
      {/* Bottom fade to seamlessly transition into next section */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}

// ─── Animated Hero Visual ─────────────────────────────────────────────────────
function HeroVisual() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large organic morphing blob - top right */}
      <motion.div
        className="absolute -top-20 -right-20 w-[600px] h-[600px] md:w-[800px] md:h-[800px] opacity-[0.07]"
        animate={{
          borderRadius: [
            "60% 40% 30% 70% / 60% 30% 70% 40%",
            "30% 60% 70% 40% / 50% 60% 30% 60%",
            "60% 40% 30% 70% / 60% 30% 70% 40%",
          ],
          rotate: [0, 180, 360],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        <div className="w-full h-full bg-gradient-to-br from-accent via-accent/50 to-emerald-300 rounded-[inherit]" />
      </motion.div>

      {/* Second blob - bottom left */}
      <motion.div
        className="absolute -bottom-32 -left-32 w-[500px] h-[500px] md:w-[700px] md:h-[700px] opacity-[0.05]"
        animate={{
          borderRadius: [
            "40% 60% 70% 30% / 40% 50% 60% 50%",
            "70% 30% 40% 60% / 60% 40% 50% 60%",
            "40% 60% 70% 30% / 40% 50% 60% 50%",
          ],
          rotate: [360, 180, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      >
        <div className="w-full h-full bg-gradient-to-tr from-emerald-400 via-accent to-teal-300 rounded-[inherit]" />
      </motion.div>

      {/* Floating geometric shapes */}
      {/* Gift box shape */}
      <motion.div
        className="absolute top-[15%] right-[10%] md:right-[15%]"
        animate={{ y: [0, -20, 0], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="opacity-[0.12] md:w-[120px] md:h-[120px]">
          <rect x="10" y="35" width="60" height="40" rx="4" stroke="currentColor" strokeWidth="1.5" className="text-accent" />
          <rect x="10" y="28" width="60" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" className="text-accent" />
          <line x1="40" y1="28" x2="40" y2="75" stroke="currentColor" strokeWidth="1.5" className="text-accent" />
          <path d="M40 28C40 28 30 15 25 15C20 15 18 20 22 24C26 28 40 28 40 28Z" stroke="currentColor" strokeWidth="1.5" className="text-accent" />
          <path d="M40 28C40 28 50 15 55 15C60 15 62 20 58 24C54 28 40 28 40 28Z" stroke="currentColor" strokeWidth="1.5" className="text-accent" />
        </svg>
      </motion.div>

      {/* Heart shape */}
      <motion.div
        className="absolute top-[60%] left-[5%] md:left-[12%]"
        animate={{ y: [0, -15, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" className="opacity-[0.1] md:w-[70px] md:h-[70px]">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="currentColor" strokeWidth="1" className="text-accent" />
        </svg>
      </motion.div>

      {/* Sparse sparkles — only 3 for subtle ambience */}
      {[
        { x: "20%", y: "25%", size: 14, delay: 0 },
        { x: "75%", y: "45%", size: 10, delay: 1.5 },
        { x: "15%", y: "75%", size: 12, delay: 0.8 },
      ].map((star, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: star.x, top: star.y }}
          animate={{
            opacity: [0, 0.5, 0],
            scale: [0.5, 1, 0.5],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            delay: star.delay,
            ease: "easeInOut",
          }}
        >
          <svg width={star.size} height={star.size} viewBox="0 0 24 24" fill="currentColor" className="text-accent">
            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
          </svg>
        </motion.div>
      ))}

      {/* Soft radial gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_center,rgba(107,143,113,0.08),transparent_60%)]" />
      <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}

// ─── On Sale Section ──────────────────────────────────────────────────────────
function OnSaleProducts() {
  const { data, isLoading } = useQuery({
    queryKey: ["on-sale-products"],
    queryFn: async () => {
      const res = await fetch("/api/products/on-sale");
      if (!res.ok) throw new Error("Failed to fetch sale products");
      return res.json() as Promise<{
        products: Array<{
          id: string;
          name: string;
          slug: string;
          price: number | null;
          comparePrice: number | null;
          salePrice: number;
          discountLabel: string;
          badge: string | null;
          image: { url: string; altText: string | null } | null;
        }>;
        count: number;
      }>;
    },
  });

  const products = data?.products || [];

  // Don't render if no products on sale
  if (!isLoading && products.length === 0) return null;

  return (
    <section className="relative overflow-hidden border-t border-border bg-gradient-to-b from-accent/[0.02] to-transparent px-4 py-32 sm:px-6 lg:px-8">
      {/* Subtle background accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-64 w-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <ScrollReveal>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-accent/30" />
            <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
              Limited Time
            </span>
            <div className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-accent/30" />
          </div>
          <h2 className="mt-4 text-center font-[family-name:var(--font-playfair)] text-4xl font-bold sm:text-5xl md:text-6xl lg:text-7xl">
            On Sale
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <p className="mt-4 text-center text-muted text-lg md:text-xl">
            Grab these personalized gifts at special prices
          </p>
        </ScrollReveal>

        <div className="mt-16">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-border bg-surface">
                  <div className="aspect-square skeleton" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 w-3/4 skeleton" />
                    <div className="h-4 w-1/2 skeleton" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <StaggerGrid
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              staggerDelay={0.08}
            >
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  slug={product.slug}
                  price={product.price}
                  comparePrice={product.comparePrice}
                  salePrice={product.salePrice}
                  badge={product.badge}
                  image={product.image}
                />
              ))}
            </StaggerGrid>
          )}
        </div>

        <ScrollReveal delay={0.2}>
          <div className="mt-12 text-center">
            <Magnetic strength={0.12}>
              <Link
                href="/shop"
                className="group inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-8 py-3.5 text-sm font-semibold text-accent transition-all hover:bg-accent hover:text-background hover:border-accent hover:shadow-lg hover:shadow-accent/20"
              >
                View All Deals
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 transition-transform group-hover:translate-x-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </Magnetic>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function FeaturedProducts() {
  const { data, isLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const res = await fetch("/api/products?limit=8&sort=newest");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json() as Promise<{
        products: Array<{
          id: string;
          name: string;
          slug: string;
          price: number | null;
          comparePrice: number | null;
          salePrice?: number | null;
          badge?: string | null;
          image: { url: string; altText: string | null } | null;
        }>;
      }>;
    },
  });

  const products = data?.products || [];

  // Don't render section if no products
  if (!isLoading && products.length === 0) return null;

  return (
    <section className="px-4 py-32 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal>
          <h2 className="text-center font-[family-name:var(--font-playfair)] text-4xl font-bold sm:text-5xl md:text-6xl lg:text-7xl">
            Our Collection
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <p className="mt-4 text-center text-muted text-lg md:text-xl">
            Handcrafted personalized gifts, made just for you
          </p>
        </ScrollReveal>

        {/* Products Grid */}
        <div className="mt-16">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-border bg-surface">
                  <div className="aspect-square skeleton" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 w-3/4 skeleton" />
                    <div className="h-4 w-1/2 skeleton" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <StaggerGrid
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              staggerDelay={0.08}
            >
              {products.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </StaggerGrid>
          )}
        </div>

        {/* View All CTA */}
        <ScrollReveal delay={0.2}>
          <div className="mt-12 text-center">
            <Magnetic strength={0.12}>
              <Link
                href="/shop"
                className="group inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-8 py-3.5 text-sm font-semibold text-accent transition-all hover:bg-accent hover:text-background hover:border-accent hover:shadow-lg hover:shadow-accent/20"
              >
                View All Products
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 transition-transform group-hover:translate-x-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </Magnetic>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);

  return (
    <div className="flex flex-col">
      {/* HERO */}
      <section
        ref={heroRef}
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background"
      >
        {/* Background: video with parallax — single unified layer */}
        <motion.div style={{ y: heroY, scale: heroScale }} className="absolute inset-0">
          <HeroBackground />
        </motion.div>

        {/* Content */}
        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 mx-auto max-w-5xl px-4 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-medium uppercase tracking-widest text-accent">
              Personalized in India since 2022
            </span>
          </motion.div>

          {/* Heading */}
          <h1 className="font-[family-name:var(--font-playfair)] text-5xl font-bold leading-[1.05] sm:text-7xl md:text-8xl lg:text-[7.5rem]">
            <TextReveal delay={0.3}>Gifts That Tell</TextReveal>
            <br />
            <span className="text-accent">
              <TextReveal delay={0.6}>Your Story</TextReveal>
            </span>
          </h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            className="mx-auto mt-8 max-w-xl text-base text-muted sm:text-lg md:text-xl leading-relaxed"
          >
            Upload your photos, choose a design, and we&apos;ll craft something
            truly unique — just for you.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Magnetic strength={0.15}>
              <Link
                href="/shop"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-accent px-8 py-4 text-sm font-semibold text-background transition-all hover:shadow-2xl hover:shadow-accent/25"
              >
                <span className="relative z-10">Explore Collection</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </Link>
            </Magnetic>
            <Magnetic strength={0.15}>
              <a
                href="https://www.instagram.com/creative_dhraa/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border px-8 py-4 text-sm font-medium text-muted transition-all hover:border-accent/50 hover:text-foreground hover:bg-accent/5"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
                @creative_dhraa
              </a>
            </Magnetic>
          </motion.div>
        </motion.div>

        {/* Scroll indicator removed — reduces cognitive overload above fold */}
      </section>

      {/* MARQUEE TICKER */}
      <section className="border-y border-border bg-surface/20 py-5">
        <Marquee
          items={marqueeItems}
          speed={25}
          direction="left"
          itemClassName="font-[family-name:var(--font-playfair)] text-lg sm:text-xl md:text-2xl font-medium text-foreground/80 uppercase tracking-wide"
          separatorClassName="text-accent text-2xl"
          separator="&#10022;"
        />
      </section>

      {/* CATEGORIES */}
      <section className="relative px-4 py-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <h2 className="text-center font-[family-name:var(--font-playfair)] text-4xl font-bold sm:text-5xl md:text-6xl lg:text-7xl">
              Shop by Category
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="mt-4 text-center text-muted text-lg md:text-xl">
              Find the perfect personalized gift for every occasion
            </p>
          </ScrollReveal>

          <StaggerGrid
            className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
            staggerDelay={0.12}
          >
            {categories.map((cat) => (
              <TiltCard key={cat.slug} maxTilt={6} scale={1.03} className="h-full">
                <Link
                  href={`/shop?category=${cat.slug}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl shadow-sm transition-all duration-500 hover:shadow-2xl hover:shadow-accent/10"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/5] w-full overflow-hidden">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    {/* Gradient overlay — always visible, darkens on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-500 group-hover:from-black/80 group-hover:via-black/30" />
                    {/* Subtle accent border glow on hover */}
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 transition-all duration-500 group-hover:ring-accent/30" />
                  </div>

                  {/* Text overlay — anchored to bottom */}
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                    <h3 className="text-xl font-semibold text-white font-[family-name:var(--font-playfair)] transition-transform duration-300 group-hover:-translate-y-1">
                      {cat.name}
                    </h3>
                    <p className="mt-1 text-sm text-white/70 transition-all duration-300 group-hover:text-white/90">
                      {cat.description}
                    </p>
                    {/* Browse arrow — always visible on touch, hover-reveal on desktop */}
                    <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-accent opacity-100 translate-y-0 md:opacity-0 md:-translate-y-2 transition-all duration-300 md:group-hover:opacity-100 md:group-hover:translate-y-0">
                      Browse Collection
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </TiltCard>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ON SALE */}
      <OnSaleProducts />

      {/* FEATURED PRODUCTS */}
      <FeaturedProducts />

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative overflow-hidden border-t border-border bg-surface/30 px-4 py-32 sm:px-6 lg:px-8">
        <div className="absolute top-0 right-0 h-96 w-96 translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <ScrollReveal>
            <h2 className="text-center font-[family-name:var(--font-playfair)] text-4xl font-bold sm:text-5xl md:text-6xl lg:text-7xl">
              How It Works
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="mt-4 text-center text-muted text-lg md:text-xl">
              Three simple steps to your perfect gift
            </p>
          </ScrollReveal>

          <div className="mt-20 grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
            {steps.map((item, i) => (
              <ScrollReveal key={item.step} delay={i * 0.15} direction="up">
                <div className="group relative flex flex-col items-center text-center">
                  <div className="relative">
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-accent/5 text-lg font-bold text-accent transition-all group-hover:border-accent/50 group-hover:bg-accent/10 group-hover:scale-110">
                      {item.step}
                    </span>
                    {i < steps.length - 1 && (
                      <div className="absolute top-1/2 left-full hidden h-px w-[calc(100%+2rem)] bg-gradient-to-r from-accent/30 to-transparent md:block" />
                    )}
                  </div>
                  <h3 className="mt-6 text-xl font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm text-muted leading-relaxed max-w-xs">{item.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF — Real trust signals */}
      <section className="px-4 py-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <h2 className="text-center font-[family-name:var(--font-playfair)] text-3xl font-bold sm:text-4xl md:text-5xl">
              What Our Customers Say
            </h2>
          </ScrollReveal>

          {/* Trust indicators */}
          <ScrollReveal delay={0.1}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted">
              <div className="flex items-center gap-2">
                <span className="text-accent font-semibold">150+</span> orders delivered
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-accent font-semibold">4.9/5</span> avg rating on Instagram
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-accent font-semibold">Based in</span> India
              </div>
            </div>
          </ScrollReveal>

          {/* Testimonials grid */}
          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                quote: "Got a custom keychain with our anniversary date. She loved it so much she cried. Worth every rupee.",
                name: "Rohit M.",
                context: "Anniversary gift",
              },
              {
                quote: "Ordered a photo album for my mom's birthday. The print quality was way better than I expected at this price.",
                name: "Priya S.",
                context: "Birthday gift",
              },
              {
                quote: "Quick response on WhatsApp, delivered in 4 days to Mumbai. Already ordered twice more for friends.",
                name: "Ankit R.",
                context: "Repeat customer",
              },
            ].map((testimonial, i) => (
              <ScrollReveal key={i} delay={i * 0.12} direction="up">
                <div className="flex h-full flex-col rounded-2xl border border-border bg-surface/50 p-6">
                  <div className="text-accent text-xl font-serif">&ldquo;</div>
                  <p className="mt-2 flex-1 text-sm text-foreground/90 leading-relaxed">
                    {testimonial.quote}
                  </p>
                  <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                    <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-accent">{testimonial.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{testimonial.name}</p>
                      <p className="text-xs text-muted">{testimonial.context}</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — Custom order focus (differentiated from hero's "Explore Collection") */}
      <section className="relative overflow-hidden px-4 py-32 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(107,143,113,0.06),transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <ScrollReveal>
            <h2 className="font-[family-name:var(--font-playfair)] text-4xl font-bold sm:text-5xl md:text-6xl lg:text-7xl">
              Have Something{" "}
              <span className="text-accent">Custom</span> in Mind?
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="mt-6 text-lg md:text-xl text-muted">
              Can&apos;t find exactly what you want? Tell us your idea and we&apos;ll make it happen.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Magnetic strength={0.12}>
                <a
                  href="https://wa.me/918839268915?text=Hi%2C%20I%20have%20a%20custom%20gift%20idea!"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-accent px-10 py-4 text-sm font-semibold text-background transition-all hover:shadow-2xl hover:shadow-accent/25"
                >
                  <span className="relative z-10">Message Us on WhatsApp</span>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="relative z-10 h-4 w-4">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                </a>
              </Magnetic>
              <Magnetic strength={0.12}>
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-8 py-4 text-sm font-medium text-muted transition-all hover:border-accent/50 hover:text-foreground hover:bg-accent/5"
                >
                  Browse Ready-Made Gifts
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 transition-transform group-hover:translate-x-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </Magnetic>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
