# Deployment Guide

Step-by-step guide to deploying the DigiManual admin dashboard to production.

---

## Prerequisites

- Vercel account (https://vercel.com) — free Hobby plan is fine to start
- GitHub account with the repo pushed to it
- Backend API already running (Railway) — you need its URL

---

## Deploy to Vercel

### Step 1 — Push to GitHub

```bash
git add .
git commit -m "ready for deploy"
git push origin main
```

### Step 2 — Import project in Vercel

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select the `digimanual_` repo
4. Vercel auto-detects Next.js — no framework config needed

### Step 3 — Set environment variables

In the Vercel project settings → **Environment Variables**:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://api-production-4804.up.railway.app/api/v1` | Production, Preview, Development |

> Do not set any other variables — the app only needs this one.

### Step 4 — Deploy

Click **Deploy**. Vercel builds with `npm run build` and serves from the edge.

First deploy takes ~2–3 minutes. Subsequent deploys on `git push` take ~60–90 seconds.

### Step 5 — Verify

1. Open the Vercel URL (e.g. `https://digimanual-admin.vercel.app`)
2. You should see the login page at `/login`
3. Log in with admin credentials
4. Check that the dashboard loads data from the API

---

## Custom domain (optional)

1. In Vercel → **Project → Settings → Domains**
2. Add your domain: e.g. `admin.digimanual.com`
3. Add the DNS records Vercel shows to your domain registrar
4. SSL is automatic (Let's Encrypt)

---

## Production build locally (sanity check)

Run this before pushing to catch build errors:

```bash
npm run build
# Should show: ✓ Compiled successfully
# No TypeScript errors
# No ESLint errors

npm run start
# Test at http://localhost:3000
```

Common build failures:
- TypeScript errors → fix types
- Missing `'use client'` directive → add to top of file
- Circular imports → restructure

---

## Vercel project settings (recommended)

| Setting | Value | Where |
|---------|-------|-------|
| Node.js version | 20.x | Project → Settings → General |
| Build command | `npm run build` (default) | — |
| Output directory | `.next` (default) | — |
| Install command | `npm install` (default) | — |
| Auto-assign custom domains | On | — |
| Ignore build step | Off | — |

### Branch deployments

| Branch | Deployment type | URL pattern |
|--------|----------------|-------------|
| `main` | Production | `your-domain.com` |
| `dev` / PR branches | Preview | `digimanual-admin-git-{branch}.vercel.app` |

Preview deployments use the same `NEXT_PUBLIC_API_URL` env var — they hit the production API unless you create separate Preview env vars pointing at a staging API.

---

## Supabase production checklist

These are backend tasks but affect what the frontend can do:

- [ ] **Enable RLS** on all tables (default deny, add explicit policies)
- [ ] **Admin policy on `manuals`** — service role key bypasses RLS; or add explicit policy
- [ ] **Admin policy on `past_questions`** — same as above
- [ ] **Storage buckets created** — `manual-covers`, `manual-pdfs`, `topic-media`, `section-media`, `past-papers`, `past-solutions`
- [ ] **Storage policies** — public read on covers; authenticated-only read on PDFs
- [ ] **Email templates** (auth emails) — customise Supabase Auth email templates with DigiManual branding
- [ ] **Supabase backups** — enable PITR (Point-in-Time Recovery) on Pro plan

---

## Railway API checklist

- [ ] **Health check endpoint** — `GET /health` returns `{ status: 'ok' }` — add to Railway service settings
- [ ] **Auto-restart** on crash — Railway does this by default
- [ ] **Environment variables** set on Railway — all secrets (Supabase keys, payment gateway keys, JWT secret)
- [ ] **Domain** — Railway provides a `.up.railway.app` subdomain, or add custom domain
- [ ] **CORS** — ensure `https://your-admin-domain.com` is in the allowed origins list on the API

---

## Rollback

If a deploy breaks something:

**Vercel instant rollback:**
1. Go to Vercel → Project → Deployments
2. Find the last known-good deployment
3. Click **"…" → Promote to Production**

Rollback takes ~10 seconds. No rebuild needed — Vercel serves the previous build from cache.

---

## CI/CD (optional, recommended)

Add a GitHub Action to run lint + type-check before every push:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
```

Vercel also runs its own build check on every PR — a failing build blocks the preview deployment.

---

## Monitoring (post-deploy)

| What to monitor | Tool | Alert condition |
|----------------|------|----------------|
| Frontend errors | Vercel Analytics / Sentry | Error rate > 1% |
| API uptime | Railway health checks | Any downtime |
| Core Web Vitals | Vercel Speed Insights | LCP > 2.5s |
| API response time | Railway metrics | p95 > 1s |
| Failed logins | Custom logging | > 10/min (brute force signal) |

Add Sentry:
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```
Set `SENTRY_DSN` as a Vercel env var.
