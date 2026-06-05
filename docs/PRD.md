# Product Requirements Document (PRD)

## Project: Creative Dhraa — Bespoke Order Management & Customization Portal

**Version:** 1.0  
**Date:** June 5, 2026  
**Author:** Shivam Kumar  
**Status:** Approved

---

## 1. Product Vision

Creative Dhraa is a premium, direct-to-consumer e-commerce platform for personalized gifts. It replaces the current Instagram DM-based ordering workflow with a frictionless, self-service storefront — enabling customers to browse, customize, and pay for products without manual intervention.

### 1.1 Business Goals

| Goal | Metric | Target |
|------|--------|--------|
| Eliminate DM-based ordering friction | Order completion rate | > 60% cart-to-purchase |
| Zero platform transaction fees | Revenue retained | 100% minus payment gateway (2%) |
| Reduce order turnaround time | Time from order to production start | < 1 hour (vs 4-12h via DM) |
| Professional brand presence | Storefront TTI | < 2 seconds |
| Monthly infrastructure cost | Hosting + services | < INR 500/month |

### 1.2 Problem Statement

Currently, Creative Dhraa operates entirely through Instagram:
- Customers discover products via posts/reels
- They DM for pricing and customization details
- Payment is collected via UPI links sent manually
- Image collection (for personalization) happens over chat
- Order tracking is nonexistent

**Pain points:**
- High abandonment rate (DM conversations drop off)
- No structured data for orders or assets
- Manual payment reconciliation
- No scalability beyond personal bandwidth
- Customer photos received via DM are compressed/low-resolution

---

## 2. Target Audience

### 2.1 Primary Persona: The Gift Buyer

| Attribute | Detail |
|-----------|--------|
| Age | 18-35 |
| Location | India (Tier 1 & 2 cities) |
| Behavior | Discovers via Instagram, expects instant gratification |
| Device | 85% mobile, 15% desktop |
| Payment preference | UPI (GPay, PhonePe), Razorpay |
| Customization need | Wants to upload personal photos + add names/dates |

### 2.2 Secondary Persona: The Admin (Store Owner)

| Attribute | Detail |
|-----------|--------|
| Role | Single operator managing orders, production, shipping |
| Needs | Fast access to order details, downloadable high-res customer images |
| Workflow | Check new orders → download assets → produce → ship → update status |

---

## 3. Product Categories

| Category | Examples | Customization Type |
|----------|----------|--------------------|
| Keychains | Photo keychains, name keychains | Template + customer photo + text |
| Photo Gifts | Photo albums, frames, collages | Template + multiple customer photos |
| Small Gifts | Fridge magnets, bookmarks, coasters | Template + customer photo/text |
| Combo/Hampers | Birthday boxes, anniversary kits | Multiple products, each customized |

---

## 4. Feature Requirements

### 4.1 Priority Matrix

| Priority | Feature | Description |
|----------|---------|-------------|
| **P0** | Product Catalog | Browse products by category with images, descriptions |
| **P0** | Template-Based Customization | Select design template, upload photo, add text |
| **P0** | Customer Image Upload | Direct-to-R2 upload via pre-signed URLs |
| **P0** | Cart & Checkout | Add items with customization data, pay via Razorpay |
| **P0** | Admin Order Management | View orders, download assets, update status |
| **P0** | Admin Product Management | Add/edit products, set prices, publish/draft |
| **P1** | Order Tracking | Email-linked tracking page for customers |
| **P1** | Admin Bulk Price Editor | Spreadsheet-style bulk pricing for imported products |
| **P1** | WhatsApp CTA | Floating button for direct contact |
| **P1** | Email Notifications | Order confirmation, shipping updates (via Resend) |
| **P2** | Live Preview | Real-time mockup of photo in template |
| **P2** | Discount Codes | Admin-created coupon system |
| **P2** | Analytics Dashboard | Revenue, top products, conversion tracking |
| **P2** | SEO Optimization | Meta tags, structured data, sitemap |

### 4.2 Out of Scope (v1)

- Multi-vendor/marketplace functionality
- User accounts/login for customers (guest checkout only for v1)
- Reviews/ratings system
- Inventory auto-sync with Instagram
- International shipping/multi-currency

---

## 5. User Flows

### 5.1 Customer Purchase Flow

```
Homepage
  │
  ├─ Browse by category OR search
  │
  ▼
Product Grid (filtered)
  │
  ▼
Product Detail Page
  │
  ├─ View images, description, price
  ├─ Select variant (size/color if applicable)
  ├─ Choose design template
  ├─ Upload personal photo(s)
  ├─ Enter text (name, date, message)
  ├─ See preview
  │
  ▼
Add to Cart
  │
  ├─ Review cart (items + customizations visible)
  ├─ Enter shipping details (name, phone, address)
  │
  ▼
Checkout (Razorpay)
  │
  ├─ UPI / Card / Netbanking
  │
  ▼
Order Confirmation
  │
  ├─ Confirmation page + email with tracking link
  │
  ▼
Order Tracking Page (accessible via email link)
```

### 5.2 Admin Order Processing Flow

```
Admin Dashboard
  │
  ├─ New order notification (email)
  │
  ▼
Order Detail Page
  │
  ├─ View: customer info, product, template chosen
  ├─ Download: high-res customer photo(s)
  ├─ Read: custom text (name, message, date)
  │
  ▼
Update Status: Processing
  │
  ├─ Produce the item
  │
  ▼
Update Status: Shipped (enter tracking number)
  │
  ├─ Customer notified via email
  │
  ▼
Update Status: Delivered
```

### 5.3 Admin Product Import Flow (One-time, via Apify)

```
Run Apify scraper on @creative_dhraa
  │
  ▼
Download all post images → Upload to R2
  │
  ▼
Parse captions → Extract name, description, hashtags
  │
  ▼
Seed database (all products as status: "draft", price: null)
  │
  ▼
Admin opens Bulk Price Editor
  │
  ├─ Sets price for each product
  ├─ Assigns categories
  ├─ Uploads design templates
  ├─ Marks as "published"
  │
  ▼
Products appear on storefront
```

---

## 6. Design Requirements

### 6.1 Brand Aesthetic: Elegant & Premium

| Element | Specification |
|---------|---------------|
| Background | Deep black (#0A0A0A) |
| Surface/Cards | Dark grey (#1A1A1A) |
| Accent | Muted gold (#C9A96E) |
| Primary text | Off-white (#F5F5F5) |
| Secondary text | Grey (#8A8A8A) |
| Heading font | Playfair Display (serif) |
| Body font | Inter (sans-serif) |
| Border radius | 8px (cards), 4px (buttons) |
| Shadows | Subtle, warm-toned glows on hover |

### 6.2 Animation Requirements

| Interaction | Animation |
|-------------|-----------|
| Page transitions | Smooth fade + slide (Framer Motion layout) |
| Scroll reveals | Elements fade-up with spring physics |
| Hover (cards) | Scale 1.02 + subtle gold border glow |
| Hover (buttons) | Background gradient shift |
| Image loading | Blur-up placeholder → sharp |
| Cart drawer | Slide-in from right with backdrop blur |
| Toast notifications | Slide-in from top, auto-dismiss |
| Template selection | Ring highlight + scale pulse |
| Upload progress | Animated progress bar (gold fill) |

### 6.3 Responsive Design

| Breakpoint | Layout |
|------------|--------|
| Mobile (< 640px) | Single column, bottom sticky CTA, swipe carousel, touch-optimized tap targets (44px min) |
| Tablet (640-1024px) | 2-column product grid, collapsible sidebar filters |
| Desktop (> 1024px) | 3-4 column grid, full navigation, hover interactions |

### 6.4 Key UI Components

- **Product Card:** Image with hover zoom, name, price badge, gold accent on hover
- **Customization Panel:** Split view (preview left, controls right) on desktop; stacked on mobile
- **Image Uploader:** Drag-and-drop zone with dashed gold border, file preview thumbnails
- **Cart Drawer:** Slide-in panel showing items with customization previews
- **Admin Table:** Sortable, filterable data table with inline edit capabilities

---

## 7. Success Metrics (v1 Launch)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Storefront TTI | < 2 seconds | Lighthouse / WebPageTest |
| Cart-to-purchase conversion | > 50% | Analytics |
| Order processing time (admin) | < 5 minutes per order | Manual tracking |
| Uptime | 99.5% | Cloudflare analytics |
| Monthly hosting cost | < INR 500 | Billing dashboard |
| Mobile Lighthouse score | > 90 (Performance) | Lighthouse CI |

---

## 8. Constraints & Assumptions

### Constraints
- Single admin operator (no multi-user RBAC needed for v1)
- Budget ceiling: INR 500/month for all infrastructure
- Must work well on low-end Android devices (60% of Indian mobile market)
- Razorpay is the only payment gateway (Indian market focus)

### Assumptions
- All 150+ Instagram posts represent individual products
- Customer phone photos (8-12MP) are sufficient resolution for print products
- Peak traffic will not exceed 1000 concurrent users in year 1
- Average order size: 1-3 items

---

## 9. Timeline

| Week | Deliverable |
|------|-------------|
| 1 | Apify scrape + data pipeline + DB seed |
| 2 | Admin dashboard (auth, product editor, bulk pricing) |
| 3 | Storefront homepage + product catalog |
| 4 | Product detail + customization engine + image upload |
| 5 | Cart + checkout + Razorpay integration |
| 6 | Order tracking + admin order management + email notifications |
| 7 | Animations, responsive polish, performance tuning |
| 8 | Testing, deployment, DNS setup, go-live |

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Neon free tier storage limit (0.5GB) | DB full | Monitor usage; upgrade to Pro ($19/mo) if needed or self-host on VPS |
| R2 free tier exceeded (10GB) | Storage costs | Compress images on upload; lifecycle rules for orphans |
| Razorpay webhook failures | Lost payment confirmations | Idempotent handler + daily reconciliation job |
| Instagram content DMCA | Legal | Only scraping own business page; one-time migration |
| Low-res customer uploads | Poor print quality | Client-side resolution warning (non-blocking) |
