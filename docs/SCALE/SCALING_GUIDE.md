# Scaling Guide

4-phase plan for growing DigiManual from 0 to enterprise scale.

---

## Current baseline (Phase 0)

| Metric | Current state |
|--------|--------------|
| Users | < 500 |
| API | Single Railway service (Node.js + Express) |
| Database | Supabase free tier (500 MB, 2 CPU) |
| Frontend | Vercel Hobby (free) |
| Storage | Supabase Storage (1 GB) |
| CDN | Vercel Edge Network (free tier) |
| Monthly cost | ~$0 |

The current architecture is sufficient for early traction and beta testing.

---

## Phase 1 — 500 → 5,000 users

**Trigger:** DAU > 200, API response times > 500ms, or storage > 800 MB

### Changes needed

**Database (Supabase Pro — $25/month)**
- Upgrade to Pro tier: 8 GB storage, 4 CPU, connection pooling via PgBouncer
- Enable read replicas for analytics queries
- Set up daily automated backups

**API (Railway Starter — ~$5/month)**
- Enable Railway autoscaling (scale from 1 to 3 replicas on CPU >70%)
- Add Redis cache (Railway Redis plugin) for:
  - `/admin/dashboard` response (TTL 60s)
  - `/admin/config` response (TTL 600s — matches cache TTL the frontend shows)
  - Leaderboard data (TTL 300s)

**Storage (Supabase Pro Storage)**
- Move to Pro storage: 100 GB
- Enable CDN for `manual-covers` bucket (public read, cached at edge)
- Keep PDFs in authenticated bucket (not CDN — access-controlled)

**Frontend (Vercel Pro — $20/month)**
- Enable Vercel Analytics for Core Web Vitals monitoring
- Add preview deployments for each PR

**Monitoring**
- Add Sentry (`npm install @sentry/nextjs`) for frontend error tracking
- Set up Railway health check endpoint

### Cost at Phase 1
| Service | Monthly cost |
|---------|-------------|
| Supabase Pro | $25 |
| Railway (API) | ~$10 |
| Vercel Pro | $20 |
| Redis (Railway) | ~$5 |
| **Total** | **~$60/month** |

---

## Phase 2 — 5,000 → 50,000 users

**Trigger:** DAU > 2,000, or Supabase DB CPU regularly above 60%, or API p95 > 1s

### Changes needed

**Database**
- Migrate from Supabase managed Postgres to **dedicated Supabase** or **self-managed RDS on AWS** (t3.medium ~$35/month)
- Partition `payments` and `section_attempts` tables by `created_at` (monthly partitions)
- Add materialized views for dashboard stats (refresh every 5 min via cron):
  ```sql
  CREATE MATERIALIZED VIEW admin_dashboard_stats AS
  SELECT
    COUNT(*) FILTER (WHERE role = 'student') AS total_students,
    ...
  FROM users;
  ```

**API**
- Split into microservices on Railway:
  - `api-content` (manuals, practicals, past papers)
  - `api-users` (auth, users, mentors)
  - `api-payments` (payments, subscriptions)
  - `api-realtime` (notifications, support chat)
- Each service scales independently

**Storage**
- Move to **Cloudflare R2** (zero egress fees) for all new uploads
- CDN via Cloudflare for all public assets
- Keep Supabase storage only for legacy files

**Search**
- Add **Meilisearch** (Railway plugin) for fast manual/practical search
- Index: title, subject, tags, level
- Replace simple `ILIKE` SQL search with Meilisearch queries

**Queue**
- Add **BullMQ + Redis** for background jobs:
  - PDF generation for student attempt exports
  - Email/SMS notification dispatch
  - Nightly analytics aggregation

**Frontend**
- Enable Next.js partial prerendering for the manuals list (static shell + dynamic data)
- Add `staleTime: 60_000` to TanStack Query config for less-changing data

### Cost at Phase 2
| Service | Monthly cost |
|---------|-------------|
| RDS t3.medium | ~$35 |
| Railway (3 services × 2 replicas) | ~$60 |
| Cloudflare R2 + CDN | ~$5 |
| Meilisearch | ~$15 |
| BullMQ Redis | ~$10 |
| Vercel Pro | $20 |
| Monitoring (Sentry + Datadog) | ~$40 |
| **Total** | **~$185/month** |

---

## Phase 3 — 50,000+ users (Enterprise)

**Trigger:** DAU > 10,000, geographic expansion beyond Cameroon, or enterprise school contracts

### Changes needed

**Infrastructure**
- Move API to **AWS ECS Fargate** (auto-scaling containers, no server management)
- Database: **AWS RDS Aurora Serverless v2** (scales to 0 during off-hours, up to 128 ACUs on peak)
- CDN: **CloudFront** in front of all APIs and static assets
- Load balancer: **AWS ALB** with health checks and circuit breakers

**Multi-region**
- Deploy API in `eu-west-1` (Paris — closest to Cameroon) and `us-east-1` (fallback)
- Database: Aurora Global Database with cross-region read replica
- Route53 latency-based routing

**Compliance**
- GDPR compliance (data residency in EU)
- Cameroon data protection regulations
- PCI-DSS level 4 for payment handling
- SOC 2 Type II (if targeting enterprise school contracts)

**AI scaling**
- Move from in-process AI grading to **dedicated ML service** (FastAPI on GPU instance)
- Model: fine-tuned for GCE Cameroon curriculum
- Separate scaling from main API

**Admin dashboard**
- Add **role-based access control** (RBAC) — see Future Features #11
- White-label support for school deployments — see Future Features #14
- Real-time collaboration (multiple admins editing simultaneously)

### Cost at Phase 3
| Service | Monthly cost |
|---------|-------------|
| AWS ECS Fargate | ~$150 |
| Aurora Serverless | ~$100 |
| CloudFront + S3 | ~$50 |
| AI/ML service (GPU) | ~$200 |
| Monitoring + security | ~$100 |
| **Total** | **~$600/month** |

At 50,000 users with an average subscription of 2,000 XAF/month (~$3.50), monthly revenue would be ~$175,000 — infrastructure is <1% of revenue.

---

## Frontend-specific scaling

These improvements apply regardless of phase:

### TanStack Query tuning
```ts
// Currently: default staleTime (0) — refetches on every focus
// Add to QueryProvider for pages that don't need instant freshness:
{
  staleTime: 30_000,        // 30s — dashboard stats, manuals list
  gcTime: 5 * 60_000,       // 5 min — keep cache while browsing
  refetchOnWindowFocus: false, // don't refetch when switching tabs
}
```

### Code splitting
Each dashboard page is already split by Next.js App Router. The `SectionEditor.tsx` (771 lines, 13 editors) should be further split:
```tsx
// Lazy-load heavy editors
const CodeEditor = dynamic(() => import('./editors/CodeEditor'), { ssr: false });
const TableEditor = dynamic(() => import('./editors/TableEditor'), { ssr: false });
```

### Image optimisation
Replace raw `<img>` tags with Next.js `<Image>` for cover thumbnails:
```tsx
import Image from 'next/image';
<Image src={manual.cover_url} width={48} height={64} alt={manual.title} />
```

### Bundle analysis
```bash
npm install --save-dev @next/bundle-analyzer
# Add to next.config.ts, then:
ANALYZE=true npm run build
```
Current suspects for bundle bloat: MUI packages (still in `package.json` but unused — should be uninstalled).

---

## Database scaling checklist

Run these as user count grows:

- [ ] Enable `pg_stat_statements` extension for slow query analysis
- [ ] Add indexes on all foreign keys (listed in DATABASE.md)
- [ ] Partition `payments` by month when table > 1M rows
- [ ] Partition `section_attempts` by month when table > 500K rows
- [ ] Archive old support tickets (> 1 year) to cold storage
- [ ] Set up `pg_cron` for nightly materialized view refresh
- [ ] Enable Supabase Realtime only on needed tables (not all by default)
