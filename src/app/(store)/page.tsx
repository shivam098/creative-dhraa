"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import TextReveal from "@/components/animations/text-reveal";
import ScrollReveal from "@/components/animations/scroll-reveal";
import StaggerGrid from "@/components/animations/stagger-grid";
import Magnetic from "@/components/animations/magnetic";
import TiltCard from "@/components/animations/tilt-card";
import ProductCard from "@/components/store/product-card";

// ─── Data ─────────────────────────────────────────────────────────────────────

const categories = [
  { name: "Keychains", slug: "keychains", description: "Custom photo keychains", image: "/images/categories/keychains.jpg" },
  { name: "Photo Gifts", slug: "photo-gifts", description: "Albums, frames & prints", image: "/images/categories/photo-gifts.jpg" },
  { name: "Small Gifts", slug: "small-gifts", description: "Magnets, bookmarks & more", image: "/images/categories/small-gifts.jpg" },
  { name: "Customised Gifts", slug: "customised-gifts", description: "Unique personalized items", image: "/images/categories/customised-gifts.jpg" },
];

const steps = [
  { step: "01", title: "Pick a Design", description: "Browse our curated collection and choose a template that resonates with your story." },
  { step: "02", title: "Upload & Personalize", description: "Add your favorite photos, names, dates, or messages to make it truly yours." },
  { step: "03", title: "We Handcraft It", description: "Our artisans carefully create your gift and deliver it to your doorstep." },
];

const testimonials = [
  { quote: "Got a custom keychain with our anniversary date. She loved it so much she cried. Worth every rupee.", name: "Rohit M.", context: "Anniversary gift" },
  { quote: "Ordered a photo album for my mom's birthday. The print quality was way better than I expected at this price.", name: "Priya S.", context: "Birthday gift" },
  { quote: "Quick response on WhatsApp, delivered in 4 days to Mumbai. Already ordered twice more for friends.", name: "Ankit R.", context: "Repeat customer" },
];

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

  return (
    <section ref={containerRef} className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 aurora-bg" />
      <div className="absolute inset-0 grid-pattern" />

      {/* Floating orbs */}
      <motion.div
        className="absolute top-20 right-[20%] w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-accent/5 blur-3xl"
        animate={{ y: [-20, 20, -20], x: [-10, 10, -10] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-20 left-[15%] w-56 sm:w-72 h-56 sm:h-72 rounded-full bg-[#C9A96E]/5 blur-3xl"
        animate={{ y: [20, -20, 20], x: [10, -10, 10] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="relative z-10 max-w-5xl mx-auto px-6 text-center"
        style={{ opacity, scale, y }}
      >
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-surface/60 backdrop-blur-sm text-sm text-muted">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Handcrafted with love in India
          </span>
        </motion.div>

        {/* Main Heading */}
        <h1 className="font-[family-name:var(--font-playfair)] text-5xl sm:text-7xl md:text-8xl lg:text-[7rem] font-light tracking-tight leading-[1.1]">
          <TextReveal delay={0.3}>Gifts That Tell</TextReveal>
          <br />
          <span className="text-gradient italic">
            <TextReveal delay={0.6}>Your Story</TextReveal>
          </span>
        </h1>

        {/* Subtitle */}
        <motion.p
          className="mt-8 sm:mt-10 max-w-xl mx-auto text-base sm:text-lg text-muted leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          Personalized keychains, photo gifts & curated hampers —
          crafted uniquely for the moments that matter most.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Magnetic strength={0.15}>
            <Link
              href="/shop"
              className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-foreground text-white font-medium text-sm overflow-hidden transition-transform"
            >
              <span className="relative z-10">Explore Collection</span>
              <motion.span
                className="relative z-10"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.span>
              <div className="absolute inset-0 bg-accent translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" />
            </Link>
          </Magnetic>

          <Magnetic strength={0.15}>
            <a
              href="https://wa.me/918839268915"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-border text-sm font-medium hover:bg-surface-hover transition-colors duration-300"
            >
              WhatsApp Us
            </a>
          </Magnetic>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="mt-16 sm:mt-20 flex items-center justify-center gap-8 sm:gap-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 2 }}
        >
          {[
            { value: "150+", label: "Orders Delivered" },
            { value: "4.9★", label: "Avg Rating" },
            { value: "48h", label: "Delivery" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-xl sm:text-2xl font-[family-name:var(--font-playfair)] font-semibold">
                {stat.value}
              </div>
              <div className="mt-1 text-[11px] sm:text-xs text-muted uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-muted">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─── On Sale Products ─────────────────────────────────────────────────────────

function OnSaleProducts() {
  const { data, isLoading } = useQuery({
    queryKey: ["on-sale-products"],
    queryFn: async () => {
      const res = await fetch("/api/products/on-sale");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const products = data?.products || [];
  if (!isLoading && products.length === 0) return null;

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal>
          <span className="block text-center text-sm uppercase tracking-[0.2em] text-gold font-medium mb-4">Limited Time</span>
          <h2 className="text-center font-[family-name:var(--font-playfair)] text-3xl font-light tracking-tight sm:text-4xl md:text-5xl">
            On <span className="italic text-gradient">Sale</span>
          </h2>
          <p className="mt-4 text-center text-muted">Grab these personalized gifts at special prices</p>
        </ScrollReveal>

        <div className="mt-12 sm:mt-16">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 sm:gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border overflow-hidden">
                  <div className="aspect-square skeleton" />
                  <div className="p-4 space-y-2"><div className="h-4 w-3/4 skeleton" /><div className="h-4 w-1/2 skeleton" /></div>
                </div>
              ))}
            </div>
          ) : (
            <StaggerGrid className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 sm:gap-6" staggerDelay={0.08}>
              {products.map((product: any) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </StaggerGrid>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Featured Products ────────────────────────────────────────────────────────

function FeaturedProducts() {
  const { data, isLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const res = await fetch("/api/products?limit=8&sort=newest");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const products = data?.products || [];
  if (!isLoading && products.length === 0) return null;

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 sm:mb-16 gap-4">
          <ScrollReveal>
            <span className="text-sm uppercase tracking-[0.2em] text-gold font-medium">Featured</span>
            <h2 className="mt-3 font-[family-name:var(--font-playfair)] text-3xl font-light tracking-tight sm:text-4xl md:text-5xl">
              Our <span className="italic text-gradient">Collection</span>
            </h2>
          </ScrollReveal>
          <Magnetic strength={0.15}>
            <Link href="/shop" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border text-sm font-medium hover:bg-foreground hover:text-white transition-all duration-500">
              View All Products →
            </Link>
          </Magnetic>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border overflow-hidden">
                <div className="aspect-square skeleton" />
                <div className="p-4 space-y-2"><div className="h-4 w-3/4 skeleton" /><div className="h-4 w-1/2 skeleton" /></div>
              </div>
            ))}
          </div>
        ) : (
          <StaggerGrid className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 sm:gap-6" staggerDelay={0.06}>
            {products.map((product: any) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </StaggerGrid>
        )}
      </div>
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div>
      {/* HERO */}
      <HeroSection />

      {/* CATEGORIES */}
      <section className="px-4 sm:px-6 lg:px-8 py-24 sm:py-32 bg-surface-hover/30">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <span className="block text-center text-sm uppercase tracking-[0.2em] text-gold font-medium mb-4">Our Collections</span>
            <h2 className="text-center font-[family-name:var(--font-playfair)] text-3xl font-light tracking-tight sm:text-4xl md:text-5xl">
              Crafted for Every <span className="italic text-gradient">Occasion</span>
            </h2>
            <p className="mt-4 text-center text-muted">Each piece is made to order, designed with care, and delivered with love.</p>
          </ScrollReveal>

          <StaggerGrid className="mt-12 sm:mt-16 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4" staggerDelay={0.12}>
            {categories.map((cat) => (
              <TiltCard key={cat.slug} maxTilt={5} scale={1.02} className="h-full">
                <Link
                  href={`/shop?category=${cat.slug}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl aspect-[3/4]"
                >
                  <div className="absolute inset-0 overflow-hidden">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  </div>
                  <div className="relative mt-auto p-4 sm:p-5">
                    <h3 className="text-base sm:text-lg font-semibold text-white font-[family-name:var(--font-playfair)]">
                      {cat.name}
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-white/70">{cat.description}</p>
                    <div className="mt-2 flex items-center gap-1 text-xs font-medium text-accent opacity-0 -translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                      Browse →
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
      <section id="how-it-works" className="px-4 sm:px-6 lg:px-8 py-24 sm:py-32 bg-surface-hover/30">
        <div className="mx-auto max-w-4xl">
          <ScrollReveal>
            <span className="block text-center text-sm uppercase tracking-[0.2em] text-gold font-medium mb-4">Simple Process</span>
            <h2 className="text-center font-[family-name:var(--font-playfair)] text-3xl font-light tracking-tight sm:text-4xl md:text-5xl">
              From Idea to <span className="italic text-gradient">Doorstep</span>
            </h2>
          </ScrollReveal>

          <div className="mt-16 sm:mt-20 grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-8">
            {steps.map((item, i) => (
              <ScrollReveal key={item.step} delay={i * 0.15} direction="up">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent/30 bg-surface text-sm font-bold text-accent">
                    {item.step}
                  </div>
                  <h3 className="mt-5 text-base sm:text-lg font-semibold font-[family-name:var(--font-playfair)]">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed max-w-[240px]">{item.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <span className="block text-center text-sm uppercase tracking-[0.2em] text-gold font-medium mb-4">Love Letters</span>
            <h2 className="text-center font-[family-name:var(--font-playfair)] text-3xl font-light tracking-tight sm:text-4xl md:text-5xl">
              What Our Customers <span className="italic text-gradient">Say</span>
            </h2>
          </ScrollReveal>

          <div className="mt-12 sm:mt-16 grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
            {testimonials.map((t, i) => (
              <ScrollReveal key={i} delay={i * 0.1} direction="up">
                <div className="flex h-full flex-col rounded-2xl border border-border p-6 sm:p-7 hover:border-accent/20 transition-colors duration-500">
                  <p className="flex-1 text-sm text-foreground/80 leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-5 flex items-center gap-3 pt-4 border-t border-border-light">
                    <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-accent">{t.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted">{t.context}</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-foreground" />
        <div className="relative max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white leading-[1.2]">
              Ready to Create
              <br />
              <span className="italic text-[#C9A96E]">Something Special?</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="mt-6 text-base sm:text-lg text-white/50 leading-relaxed">
              Join 150+ happy customers who chose to make their gifts unforgettable.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Magnetic strength={0.15}>
                <Link
                  href="/shop"
                  className="group relative inline-flex items-center gap-3 px-10 py-4 rounded-full bg-white text-foreground font-medium text-sm overflow-hidden"
                >
                  <span className="relative z-10">Start Shopping</span>
                  <span className="relative z-10">→</span>
                  <div className="absolute inset-0 bg-[#C9A96E] translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" />
                </Link>
              </Magnetic>
              <Magnetic strength={0.15}>
                <a
                  href="https://wa.me/918839268915?text=Hi%2C%20I%20have%20a%20custom%20gift%20idea!"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-10 py-4 rounded-full border border-white/20 text-white font-medium text-sm hover:bg-white/10 transition-colors duration-300"
                >
                  Chat on WhatsApp
                </a>
              </Magnetic>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
