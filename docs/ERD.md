# Engineering Requirements Document (ERD)

## Project: Creative Dhraa — Bespoke Order Management & Customization Portal

**Version:** 2.0 (Refined)  
**Date:** June 5, 2026  
**Architecture:** Headless E-commerce (High-Margin, Low-Infra Cost)  
**Status:** Approved

---

## 1. Executive Summary

Development of a custom headless e-commerce platform tailored for personalized gifts (keychains, photo albums, custom prints). The system bypasses standard SaaS platforms to eliminate transaction fees and provides a frictionless, purpose-built UI for collecting customer customization data (images, text, template selection) at the point of sale.

Initial product catalog is seeded from the existing Instagram page (@creative_dhraa) via Apify web scraper, with ongoing management through a custom admin dashboard.

---

## 2. Technical Stack (Final — No Ambiguity)

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Framework** | Next.js 14 (App Router) | SSR/SSG, edge-compatible, single deployment unit |
| **Language** | TypeScript (strict mode) | Type safety across full stack |
| **Styling** | Tailwind CSS + shadcn/ui | Utility-first, consistent design system, accessible components |
| **Animation** | Framer Motion | Declarative, GPU-accelerated, layout animations |
| **Client State** | Zustand | Lightweight, no boilerplate, persisted cart |
| **Server State** | TanStack React Query | Cache invalidation, optimistic updates, background refetching |
| **Backend** | Next.js API Routes + Hono | Edge-compatible, no separate server, type-safe routing |
| **ORM** | Drizzle ORM | Edge-compatible, type-safe, lighter than Prisma |
| **Database** | Neon PostgreSQL (serverless) | Free tier (0.5GB), auto-scaling, connection pooling built-in |
| **Object Storage** | Cloudflare R2 | S3-compatible, zero egress fees, 10GB free |
| **Hosting** | Cloudflare Pages | Free tier, global edge network, native Next.js support |
| **Payments** | Razorpay | Indian market standard, UPI/Card/Netbanking, 2% fee |
| **Email** | Resend | 3000 emails/month free, React email templates |
| **Scraping** | Apify (one-time) | Instagram profile scraper for initial data migration |
| **Domain Registrar** | Cloudflare Registrar | At-cost pricing, integrated DNS |

### 2.1 Infrastructure Cost Model

```
Cloudflare Pages:         INR 0/month   (free tier: unlimited sites, bandwidth)
Neon PostgreSQL:          INR 0/month   (free tier: 0.5GB storage, 100 hours compute)
Cloudflare R2:            INR 0/month   (free tier: 10GB storage, 10M reads, 1M writes)
Resend:                   INR 0/month   (free tier: 3000 emails/month)
Apify:                    ~INR 0        (one-time scrape, free tier sufficient)
Domain (.in or .com):     INR 100-800/year
Razorpay:                 2% per transaction (variable, not infra cost)
────────────────────────────────────────────
Total Fixed Cost:         INR 0-70/month
```

---

## 3. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE EDGE                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Cloudflare Pages (Next.js 14)                  │  │
│  │  ┌──────────────────┐    ┌──────────────────────────────┐  │  │
│  │  │  Static Assets   │    │     Edge API Routes          │  │  │
│  │  │  (SSG pages,     │    │  ┌────────────────────────┐  │  │  │
│  │  │   CSS, JS, imgs) │    │  │  /api/products         │  │  │  │
│  │  │                  │    │  │  /api/orders            │  │  │  │
│  │  │  CDN cached at   │    │  │  /api/upload            │  │  │  │
│  │  │  300+ edge PoPs  │    │  │  /api/payments          │  │  │  │
│  │  └──────────────────┘    │  │  /api/admin/*           │  │  │  │
│  │                          │  └────────────────────────┘  │  │  │
│  │                          └──────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────┐                                                 │
│  │ Cloudflare R2│  (Product images, templates, customer uploads)  │
│  └──────────────┘                                                 │
└──────────────────────────────────────────────────────────────────┘
         │                              │
         │  DB Connection (HTTP)        │  Webhooks (HTTPS)
         ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│  Neon PostgreSQL │          │    Razorpay      │
│  (Serverless)    │          │    Payment GW    │
│                  │          │                  │
│  - Products      │          │  - Order creation│
│  - Orders        │          │  - Webhook verify│
│  - Uploads       │          │  - Refunds       │
│  - Categories    │          └──────────────────┘
│  - Templates     │
└──────────────────┘          ┌──────────────────┐
                              │     Resend       │
                              │  (Transactional  │
                              │   Emails)        │
                              └──────────────────┘
```

---

## 4. Database Schema

### 4.1 Entity Relationship Diagram

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  categories │     │    products       │     │ product_images  │
├─────────────┤     ├──────────────────┤     ├─────────────────┤
│ id (PK)     │◀───┤ category_id (FK)  │────▶│ product_id (FK) │
│ name        │     │ id (PK)          │     │ id (PK)         │
│ slug        │     │ name             │     │ url             │
│ description │     │ slug             │     │ alt_text        │
│ created_at  │     │ description      │     │ position        │
└─────────────┘     │ price            │     │ is_primary      │
                    │ compare_price    │     └─────────────────┘
                    │ status           │
                    │ instagram_post_id│     ┌─────────────────┐
                    │ created_at       │     │product_variants │
                    │ updated_at       │────▶├─────────────────┤
                    └──────────────────┘     │ id (PK)         │
                                            │ product_id (FK) │
┌──────────────────┐                        │ name            │
│design_templates  │                        │ value           │
├──────────────────┤                        │ price_modifier  │
│ id (PK)          │                        │ stock           │
│ product_id (FK)  │                        └─────────────────┘
│ name             │
│ preview_url      │     ┌──────────────────────────────────────────┐
│ layout_data JSON │     │              orders                      │
│ created_at       │     ├──────────────────────────────────────────┤
└──────────────────┘     │ id (PK)                                  │
                         │ order_number (unique, human-readable)     │
                         │ customer_name                             │
                         │ customer_email                            │
                         │ customer_phone                            │
                         │ shipping_address (JSONB)                  │
                         │ status (pending/processing/shipped/       │
                         │         delivered/cancelled)              │
                         │ subtotal                                  │
                         │ shipping_cost                             │
                         │ discount_amount                           │
                         │ total                                     │
                         │ payment_id (razorpay)                     │
                         │ payment_status (pending/paid/failed/      │
                         │                 refunded)                 │
                         │ notes                                     │
                         │ created_at                                │
                         │ updated_at                                │
                         └────────────────────┬─────────────────────┘
                                              │
                                              ▼
                         ┌──────────────────────────────────────────┐
                         │           order_items                     │
                         ├──────────────────────────────────────────┤
                         │ id (PK)                                   │
                         │ order_id (FK)                             │
                         │ product_id (FK)                           │
                         │ variant_id (FK, nullable)                 │
                         │ template_id (FK, nullable)                │
                         │ quantity                                  │
                         │ unit_price                                │
                         │ customization (JSONB)                     │
                         │   {                                       │
                         │     "text_fields": {                      │
                         │       "name": "Priya",                    │
                         │       "message": "Happy Birthday"         │
                         │     },                                    │
                         │     "images": [                           │
                         │       { "url": "...", "position": "..." } │
                         │     ]                                     │
                         │   }                                       │
                         │ created_at                                │
                         └──────────────────────────────────────────┘
                                              │
                                              ▼
                         ┌──────────────────────────────────────────┐
                         │         customer_uploads                  │
                         ├──────────────────────────────────────────┤
                         │ id (PK)                                   │
                         │ order_item_id (FK, nullable)              │
                         │ session_id                                │
                         │ r2_key                                    │
                         │ r2_url                                    │
                         │ original_filename                         │
                         │ file_type (jpeg/png/webp)                 │
                         │ file_size_bytes                           │
                         │ width                                     │
                         │ height                                    │
                         │ status (pending/linked/orphaned)          │
                         │ created_at                                │
                         │ expires_at                                │
                         └──────────────────────────────────────────┘

                         ┌──────────────────────────────────────────┐
                         │           admin_users                     │
                         ├──────────────────────────────────────────┤
                         │ id (PK)                                   │
                         │ email                                     │
                         │ password_hash (bcrypt)                    │
                         │ name                                      │
                         │ created_at                                │
                         │ last_login_at                             │
                         └──────────────────────────────────────────┘
```

### 4.2 Customization Data (JSONB) Schema

```json
{
  "$schema": "order_item.customization",
  "template_id": "tmpl_heart_frame",
  "text_fields": {
    "name": "string (max 50 chars)",
    "date": "string (max 20 chars)",
    "message": "string (max 200 chars)"
  },
  "images": [
    {
      "upload_id": "upl_abc123",
      "r2_url": "https://r2.domain.com/uploads/session/img.jpg",
      "position": "center|top|bottom|left|right",
      "crop": { "x": 0, "y": 0, "width": 500, "height": 500 }
    }
  ]
}
```

---

## 5. API Contract

### 5.1 Public API (Customer-Facing)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List published products (paginated, filterable) |
| GET | `/api/products/[slug]` | Single product with images, variants, templates |
| GET | `/api/categories` | List all categories |
| POST | `/api/upload/presign` | Request pre-signed URL for image upload |
| POST | `/api/orders` | Create order (cart payload + customer info) |
| POST | `/api/payments/create` | Generate Razorpay order ID |
| POST | `/api/payments/verify` | Verify payment signature (webhook) |
| GET | `/api/orders/track/[orderNumber]` | Public order tracking |

### 5.2 Admin API (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/auth/login` | Admin login (returns JWT) |
| POST | `/api/admin/auth/refresh` | Refresh access token |
| GET | `/api/admin/orders` | List all orders (paginated, filterable) |
| GET | `/api/admin/orders/[id]` | Order detail with uploads |
| PATCH | `/api/admin/orders/[id]` | Update order status |
| GET | `/api/admin/products` | List all products (including drafts) |
| POST | `/api/admin/products` | Create product |
| PATCH | `/api/admin/products/[id]` | Update product |
| DELETE | `/api/admin/products/[id]` | Soft-delete product |
| POST | `/api/admin/products/bulk` | Bulk update prices/status |
| POST | `/api/admin/templates` | Upload design template |
| GET | `/api/admin/dashboard` | Stats (revenue, orders, top products) |

### 5.3 Key Request/Response Schemas

#### POST `/api/upload/presign`

Request:
```json
{
  "file_type": "image/jpeg",
  "file_size": 4500000,
  "session_id": "sess_abc123"
}
```

Response:
```json
{
  "upload_url": "https://r2.domain.com/uploads/sess_abc123/img_001.jpg?X-Amz-...",
  "upload_id": "upl_001",
  "r2_key": "uploads/sess_abc123/img_001.jpg",
  "expires_in": 300
}
```

Validation:
- `file_type` must be: `image/jpeg`, `image/png`, `image/webp`
- `file_size` must be: <= 10,485,760 bytes (10MB)
- Rate limit: 5 uploads per session per 10 minutes

#### POST `/api/orders`

Request:
```json
{
  "customer": {
    "name": "Priya Sharma",
    "email": "priya@example.com",
    "phone": "+919876543210"
  },
  "shipping_address": {
    "line1": "123 MG Road",
    "line2": "Apt 4B",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  },
  "items": [
    {
      "product_id": "prod_abc123",
      "variant_id": "var_small",
      "template_id": "tmpl_heart",
      "quantity": 1,
      "customization": {
        "text_fields": { "name": "Rahul", "message": "Love you" },
        "images": [
          { "upload_id": "upl_001", "r2_url": "...", "position": "center" }
        ]
      }
    }
  ]
}
```

---

## 6. Core System Workflows

### 6.1 Customer Image Upload (Pre-Signed URL Flow)

```
┌──────────┐                ┌──────────────┐              ┌─────────────┐
│  Client  │                │  API Route   │              │Cloudflare R2│
│ (Browser)│                │  /api/upload │              │             │
└────┬─────┘                └──────┬───────┘              └──────┬──────┘
     │                             │                              │
     │  1. POST /api/upload/presign│                              │
     │  {file_type, file_size,     │                              │
     │   session_id}               │                              │
     │────────────────────────────▶│                              │
     │                             │                              │
     │                             │  2. Validate:                │
     │                             │  - Session exists            │
     │                             │  - File type allowed         │
     │                             │  - File size <= 10MB         │
     │                             │  - Rate limit not exceeded   │
     │                             │                              │
     │                             │  3. Generate pre-signed      │
     │                             │     PUT URL (5 min TTL)      │
     │                             │                              │
     │                             │  4. Record upload in DB      │
     │                             │     (status: "pending")      │
     │                             │                              │
     │  5. Return {upload_url,     │                              │
     │     upload_id, expires_in}  │                              │
     │◀────────────────────────────│                              │
     │                             │                              │
     │  6. PUT binary image data   │                              │
     │─────────────────────────────┼─────────────────────────────▶│
     │                             │                              │
     │  7. 200 OK                  │                              │
     │◀────────────────────────────┼──────────────────────────────│
     │                             │                              │
     │  8. Attach upload_id +      │                              │
     │     r2_url to cart item     │                              │
     │                             │                              │
```

**Safeguards:**
- Server validates file type via Content-Type header AND magic bytes post-upload
- File size enforced both client-side and via R2 upload size limit in pre-signed URL
- Each upload is bound to a session_id; order submission validates URL ownership
- Orphan cleanup: Cron job (or R2 lifecycle rule) deletes uploads with `status: "pending"` older than 24 hours
- Rate limit: 5 uploads per session per 10 minutes (prevents abuse)

### 6.2 Checkout & Payment Workflow

```
┌──────────┐         ┌──────────────┐        ┌──────────┐       ┌────────┐
│  Client  │         │   Backend    │        │ Razorpay │       │  Neon  │
└────┬─────┘         └──────┬───────┘        └────┬─────┘       └───┬────┘
     │                      │                      │                 │
     │ 1. POST /api/orders  │                      │                 │
     │ (cart + customer)    │                      │                 │
     │─────────────────────▶│                      │                 │
     │                      │                      │                 │
     │                      │ 2. Validate cart     │                 │
     │                      │    items, prices,    │                 │
     │                      │    upload ownership  │                 │
     │                      │                      │                 │
     │                      │ 3. Create order      │                 │
     │                      │    (status: pending) │                 │
     │                      │──────────────────────┼────────────────▶│
     │                      │                      │                 │
     │                      │ 4. Create Razorpay   │                 │
     │                      │    order             │                 │
     │                      │─────────────────────▶│                 │
     │                      │                      │                 │
     │                      │ 5. Return order_id + │                 │
     │                      │    razorpay_order_id │                 │
     │◀─────────────────────│                      │                 │
     │                      │                      │                 │
     │ 6. Open Razorpay     │                      │                 │
     │    Checkout modal    │                      │                 │
     │─────────────────────────────────────────────▶                 │
     │                      │                      │                 │
     │ 7. Payment complete  │                      │                 │
     │◀─────────────────────────────────────────────                 │
     │                      │                      │                 │
     │                      │ 8. Webhook: payment  │                 │
     │                      │    authorized        │                 │
     │                      │◀─────────────────────│                 │
     │                      │                      │                 │
     │                      │ 9. Verify signature  │                 │
     │                      │    (HMAC-SHA256)     │                 │
     │                      │                      │                 │
     │                      │ 10. Update order:    │                 │
     │                      │     payment_status   │                 │
     │                      │     = "paid"         │                 │
     │                      │     status =         │                 │
     │                      │     "processing"     │                 │
     │                      │──────────────────────┼────────────────▶│
     │                      │                      │                 │
     │                      │ 11. Link uploads     │                 │
     │                      │     to order_items   │                 │
     │                      │     (permanent)      │                 │
     │                      │──────────────────────┼────────────────▶│
     │                      │                      │                 │
     │                      │ 12. Send confirmation│                 │
     │                      │     email (Resend)   │                 │
     │                      │                      │                 │
```

**Critical Implementation Details:**
- **Idempotency:** Webhook handler uses `razorpay_payment_id` as idempotency key. Duplicate webhooks are ignored.
- **Race condition:** Client redirect shows "confirming payment..." spinner. Polls `/api/orders/track/[id]` until webhook processes.
- **Failure recovery:** If webhook never arrives, a daily reconciliation job checks Razorpay API for unconfirmed payments.
- **Signature verification:** Every webhook is verified using HMAC-SHA256 with Razorpay webhook secret. Unverified requests are rejected with 401.

### 6.3 Data Migration Workflow (Apify → R2 → PostgreSQL)

```
┌──────────┐         ┌──────────────┐        ┌──────────┐       ┌────────┐
│  Apify   │         │  Seed Script │        │    R2    │       │  Neon  │
└────┬─────┘         └──────┬───────┘        └────┬─────┘       └───┬────┘
     │                      │                      │                 │
     │ 1. Scrape            │                      │                 │
     │    @creative_dhraa   │                      │                 │
     │    (150+ posts)      │                      │                 │
     │─────────────────────▶│                      │                 │
     │                      │                      │                 │
     │ 2. Return JSON:      │                      │                 │
     │    [{displayUrl,     │                      │                 │
     │      caption,        │                      │                 │
     │      hashtags,       │                      │                 │
     │      timestamp}]     │                      │                 │
     │─────────────────────▶│                      │                 │
     │                      │                      │                 │
     │                      │ 3. For each post:    │                 │
     │                      │    Download image    │                 │
     │                      │    from displayUrl   │                 │
     │                      │                      │                 │
     │                      │ 4. Upload to R2      │                 │
     │                      │    /products/{slug}/ │                 │
     │                      │─────────────────────▶│                 │
     │                      │                      │                 │
     │                      │ 5. Parse caption:    │                 │
     │                      │    - Line 1 → name   │                 │
     │                      │    - Rest → desc     │                 │
     │                      │    - Hashtags → cat  │                 │
     │                      │                      │                 │
     │                      │ 6. Insert into DB:   │                 │
     │                      │    products (draft,  │                 │
     │                      │    price: null)      │                 │
     │                      │    product_images    │                 │
     │                      │    categories        │                 │
     │                      │──────────────────────┼────────────────▶│
     │                      │                      │                 │
```

---

## 7. Security Requirements

### 7.1 Authentication & Authorization

| Context | Mechanism |
|---------|-----------|
| Admin login | Email/password → bcrypt hash comparison → JWT (access + refresh tokens) |
| Access token | Short-lived (15 min), stored in memory |
| Refresh token | Long-lived (7 days), stored in httpOnly cookie |
| Customer sessions | Anonymous session via `crypto.randomUUID()`, stored in localStorage |
| API protection | Admin routes require valid JWT in Authorization header |
| CORS | Strict origin whitelist: `creativedhraa.in`, `www.creativedhraa.in` |

### 7.2 Payment Security (PCI Compliance)

- **Zero card data touches the backend.** All payment capture is handled by Razorpay's SDK/iframe.
- Backend only receives: `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`
- Signature verified server-side before updating order status
- Razorpay webhook secret stored as environment variable, never in code

### 7.3 Upload Security

| Threat | Mitigation |
|--------|------------|
| Malicious file upload | Server validates MIME type; R2 serves with `Content-Disposition: attachment` |
| File size abuse | Pre-signed URL includes max content-length condition |
| URL spoofing in cart | Backend validates upload_id belongs to the session submitting the order |
| Orphaned files | Lifecycle rule: delete `status: "pending"` uploads after 24h |
| Hotlinking | R2 bucket is private; public access only via signed URLs with expiry |
| Excessive uploads | Rate limit: 5 uploads/session/10min |

### 7.4 API Security

| Protection | Implementation |
|------------|----------------|
| Rate limiting | Token bucket algorithm: 100 req/min per IP (general), 10 req/min (auth endpoints) |
| Input validation | Zod schemas for all request bodies |
| SQL injection | Parameterized queries via Drizzle ORM (no raw SQL) |
| XSS | React's built-in escaping + CSP headers |
| CSRF | SameSite=Strict cookies + Origin header validation |

---

## 8. Non-Functional Requirements

### 8.1 Performance

| Metric | Target | How |
|--------|--------|-----|
| Time to Interactive (TTI) | < 2 seconds | SSG for catalog pages, edge caching |
| Largest Contentful Paint (LCP) | < 2.5 seconds | Next.js Image optimization, AVIF/WebP |
| Cumulative Layout Shift (CLS) | < 0.1 | Fixed aspect-ratio containers, font preloading |
| First Input Delay (FID) | < 100ms | Code splitting, minimal client-side JS |
| API response time (p95) | < 200ms | Edge functions, Neon serverless driver |
| Image upload throughput | Direct to R2 | No backend bottleneck |

### 8.2 Availability & Reliability

| Aspect | Specification |
|--------|---------------|
| Uptime target | 99.5% (Cloudflare SLA covers this) |
| Database backup | Neon automatic daily backups (7-day retention on free tier) |
| R2 durability | 99.999999999% (11 nines, same as S3) |
| Error handling | Global error boundary (frontend), structured error responses (API) |
| Graceful degradation | If payment webhook fails, reconciliation job catches it within 24h |

### 8.3 Monitoring & Observability

| Component | Tool | Cost |
|-----------|------|------|
| Frontend errors | Sentry (free tier: 5K events/month) | INR 0 |
| API logs | Cloudflare Pages analytics (built-in) | INR 0 |
| Uptime monitoring | Cloudflare Health Checks OR BetterUptime free | INR 0 |
| Database metrics | Neon dashboard (built-in) | INR 0 |
| Payment monitoring | Razorpay dashboard | INR 0 |

### 8.4 Scalability Considerations

| Concern | Solution |
|---------|----------|
| DB connection exhaustion | Neon's built-in connection pooling (no PgBouncer needed) |
| Traffic spikes | Cloudflare edge absorbs static requests; API rate limiting protects backend |
| Storage growth | Monitor R2 usage; orphan cleanup prevents waste |
| Email limits | Resend free tier = 3000/month; upgrade if > 100 orders/day |

---

## 9. Development Environment & Tooling

### 9.1 Local Development

```bash
# Prerequisites
Node.js >= 20 (LTS)
pnpm (package manager)

# Local services
Neon CLI (for local Postgres branching)
Wrangler CLI (for R2 local development)

# Dev server
pnpm dev → Next.js on localhost:3000 (hot reload)
```

### 9.2 CI/CD Pipeline

```
Push to main branch
       │
       ▼
GitHub Actions:
  ├─ Lint (ESLint + Prettier)
  ├─ Type check (tsc --noEmit)
  ├─ Unit tests (Vitest)
  ├─ Build (next build)
  │
  ▼ (all pass)
Deploy to Cloudflare Pages (automatic via Git integration)
  │
  ▼
Run Drizzle migrations (if schema changed)
```

### 9.3 Branch Strategy

```
main          → Production (auto-deploys to Cloudflare Pages)
develop       → Staging/integration
feature/*     → Individual features (PR into develop)
hotfix/*      → Emergency fixes (PR into main)
```

---

## 10. Project Structure

```
creative_dhraa/
├── docs/
│   ├── PRD.md
│   └── ERD.md
├── src/
│   ├── app/
│   │   ├── (store)/                 # Customer storefront (route group)
│   │   │   ├── page.tsx             # Homepage
│   │   │   ├── shop/
│   │   │   │   ├── page.tsx         # Product grid
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx     # Product detail + customization
│   │   │   ├── cart/
│   │   │   │   └── page.tsx         # Cart page
│   │   │   ├── checkout/
│   │   │   │   └── page.tsx         # Checkout flow
│   │   │   └── track/
│   │   │       └── [orderId]/
│   │   │           └── page.tsx     # Order tracking
│   │   ├── (admin)/                 # Admin dashboard (route group)
│   │   │   ├── layout.tsx           # Admin layout (sidebar, auth guard)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx         # Overview stats
│   │   │   ├── products/
│   │   │   │   ├── page.tsx         # Product list + bulk editor
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx     # Edit product
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx         # Order list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx     # Order detail + asset download
│   │   │   ├── templates/
│   │   │   │   └── page.tsx         # Template management
│   │   │   └── settings/
│   │   │       └── page.tsx         # Store settings
│   │   ├── api/                     # API routes
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── upload/
│   │   │   ├── payments/
│   │   │   └── admin/
│   │   ├── layout.tsx               # Root layout
│   │   └── globals.css              # Tailwind base styles
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components
│   │   ├── store/                   # Storefront components
│   │   │   ├── product-card.tsx
│   │   │   ├── product-grid.tsx
│   │   │   ├── customization-panel.tsx
│   │   │   ├── image-uploader.tsx
│   │   │   ├── template-picker.tsx
│   │   │   ├── cart-drawer.tsx
│   │   │   └── checkout-form.tsx
│   │   └── admin/                   # Admin components
│   │       ├── order-table.tsx
│   │       ├── product-editor.tsx
│   │       ├── bulk-price-editor.tsx
│   │       └── stats-cards.tsx
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts            # Drizzle schema definitions
│   │   │   ├── index.ts             # DB connection
│   │   │   └── migrations/          # SQL migrations
│   │   ├── auth/
│   │   │   ├── jwt.ts               # Token generation/verification
│   │   │   └── middleware.ts        # Auth middleware
│   │   ├── storage/
│   │   │   └── r2.ts                # R2 client + pre-signed URL generation
│   │   ├── payments/
│   │   │   └── razorpay.ts          # Razorpay client + webhook verification
│   │   ├── email/
│   │   │   └── resend.ts            # Email templates + sending
│   │   └── utils/
│   │       ├── validators.ts        # Zod schemas
│   │       └── helpers.ts           # Shared utilities
│   ├── hooks/                       # Custom React hooks
│   │   ├── use-cart.ts
│   │   ├── use-upload.ts
│   │   └── use-session.ts
│   └── stores/                      # Zustand stores
│       └── cart-store.ts
├── scripts/
│   ├── seed/
│   │   ├── scrape-instagram.ts      # Apify scraper invocation
│   │   ├── download-assets.ts       # Download images from scraped URLs
│   │   ├── upload-to-r2.ts          # Bulk upload to R2
│   │   └── seed-database.ts         # Insert products into Neon
│   └── reconcile-payments.ts        # Daily payment reconciliation
├── drizzle.config.ts                # Drizzle ORM config
├── next.config.ts                   # Next.js config
├── tailwind.config.ts               # Tailwind + custom theme
├── tsconfig.json
├── package.json
├── .env.example                     # Environment variables template
├── .env.local                       # Local env (git-ignored)
└── .gitignore
```

---

## 11. Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/creative_dhraa

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=creative-dhraa-assets
R2_PUBLIC_URL=https://assets.creativedhraa.in

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Auth
JWT_SECRET=
JWT_REFRESH_SECRET=

# Email
RESEND_API_KEY=

# Apify (one-time use)
APIFY_API_TOKEN=

# App
NEXT_PUBLIC_APP_URL=https://creativedhraa.in
NEXT_PUBLIC_RAZORPAY_KEY_ID=
```

---

## 12. Development Timeline

| Week | Phase | Deliverables |
|------|-------|-------------|
| **1** | Data Migration | Apify scraper script, asset download pipeline, R2 upload, DB seeding, 150+ products imported as drafts |
| **2** | Admin Foundation | Admin auth (login/JWT), product list, bulk price editor, publish/draft toggle |
| **3** | Storefront Core | Homepage (hero, featured, categories), product grid with filters, responsive layout |
| **4** | Customization Engine | Template picker, image uploader (pre-signed URL flow), text fields, live preview |
| **5** | Commerce Flow | Cart (Zustand persisted), checkout form, Razorpay integration, order creation |
| **6** | Operations | Order tracking page, admin order management, email notifications (Resend), webhook handling |
| **7** | Polish | Framer Motion animations, responsive fine-tuning, skeleton loaders, error states, Lighthouse optimization |
| **8** | Launch | Testing (Vitest + Playwright), Cloudflare Pages deployment, DNS setup, go-live checklist |

---

## 13. Deployment Checklist (Week 8)

- [ ] Domain registered and DNS pointing to Cloudflare
- [ ] SSL certificate active (automatic via Cloudflare)
- [ ] Environment variables set in Cloudflare Pages dashboard
- [ ] Database migrations run on production Neon instance
- [ ] R2 bucket created with correct CORS policy
- [ ] Razorpay webhook URL configured (production endpoint)
- [ ] Admin user created (seeded via script)
- [ ] Resend domain verified for transactional emails
- [ ] Sentry DSN configured for error tracking
- [ ] Lighthouse scores verified: Performance > 90, Accessibility > 90
- [ ] Mobile responsiveness tested on actual devices (Android + iOS)
- [ ] Payment flow tested end-to-end (Razorpay test mode → live mode)
- [ ] Orphan upload cleanup job scheduled
- [ ] Backup strategy confirmed (Neon auto-backups active)

---

## 14. Risk Register

| ID | Risk | Probability | Impact | Mitigation |
|----|------|-------------|--------|------------|
| R1 | Neon free tier storage exhausted | Medium | High | Monitor usage; upgrade plan or migrate to self-hosted Postgres |
| R2 | Cloudflare Pages Next.js compatibility issues | Low | Medium | Test edge cases early; fallback: deploy to Vercel free tier |
| R3 | Razorpay webhook delivery failures | Low | High | Idempotent handlers + daily reconciliation job |
| R4 | Customer uploads inappropriate content | Medium | Low | Manual admin review before production; async moderation later |
| R5 | High traffic overwhelms Neon compute | Low | Medium | Neon auto-scales; add caching layer (React Query stale-while-revalidate) |
| R6 | Instagram media URLs expire before download | Medium | Medium | Seed script downloads immediately; retry logic for failed downloads |
| R7 | Low-resolution customer photos | High | Low | Client-side warning (non-blocking); admin can reject order |
