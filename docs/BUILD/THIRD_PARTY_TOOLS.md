# Third-Party Tools & Services

All external dependencies used by the DigiManual admin dashboard, with signup links and purpose notes.

---

## Frontend dependencies (npm)

### Next.js 16
- **What:** React framework — App Router, file-based routing, server components, image optimisation
- **Why:** SSR/SSG capabilities, built-in TypeScript support, Vercel-native deployment
- **Docs:** https://nextjs.org/docs
- **Version in use:** `16.0.7`

### React 19
- **What:** UI rendering library
- **Why:** Required by Next.js 16; concurrent features, improved hydration
- **Docs:** https://react.dev
- **Version in use:** `19.2.0`

### TypeScript 5
- **What:** Static typing for JavaScript
- **Why:** Catches type errors at build time; all API response shapes are typed in `lib/types/api.ts`
- **Docs:** https://www.typescriptlang.org/docs
- **Version in use:** `^5`

### Tailwind CSS v4
- **What:** Utility-first CSS framework
- **Why:** Rapid styling without custom CSS files; v4 uses new Oxide engine (faster JIT)
- **Docs:** https://tailwindcss.com/docs
- **Note:** Uses `@tailwindcss/postcss` v4 plugin — **not** the old `tailwind.config.js` approach
- **Version in use:** `^4`

### TanStack Query v5 (React Query)
- **What:** Server-state management — caching, background refetch, loading/error states
- **Why:** All API data goes through `useQuery` / `useMutation`; avoids manual loading state boilerplate
- **Docs:** https://tanstack.com/query/v5
- **Signup:** No account needed (open source)
- **Version in use:** `^5.101.1`

### Zustand v5
- **What:** Lightweight client-state management
- **Why:** Used for auth state (`accessToken`, `user`) and sidebar state (`isCollapsed`); zero boilerplate
- **Docs:** https://zustand.pmnd.rs
- **Version in use:** `^5.0.9`

### Axios
- **What:** HTTP client
- **Why:** Interceptors for auto-attaching Bearer token and handling 401 → token refresh silently
- **Docs:** https://axios-http.com/docs/intro
- **Version in use:** `^1.13.2`

### @dnd-kit/core + @dnd-kit/sortable
- **What:** Drag-and-drop library
- **Why:** Used in the Practicals editor to reorder sections via drag; accessibility-first, touch-friendly
- **Docs:** https://dndkit.com
- **Version in use:** core `^6.3.1`, sortable `^10.0.0`

### Lucide React
- **What:** Icon library (SVG icons as React components)
- **Why:** Consistent icon set; tree-shakeable; used across all pages
- **Docs:** https://lucide.dev
- **Version in use:** `^0.556.0`

### Recharts
- **What:** Charting library built on D3
- **Why:** Used on the dashboard home for revenue/income charts
- **Docs:** https://recharts.org
- **Version in use:** `^2.12.7`

### Sonner
- **What:** Toast notification library
- **Why:** All success/error feedback uses `toast.success()` / `toast.error()`; minimal bundle size
- **Docs:** https://sonner.emilkowal.ski
- **Version in use:** `^2.0.7`

### React Hook Form + Zod
- **What:** Form state management (RHF) + schema validation (Zod)
- **Why:** Available for forms that need complex validation; most simple forms use controlled state directly
- **Docs:** https://react-hook-form.com · https://zod.dev
- **Versions:** `^7.68.0` · `^4.1.13`

### Geist Font (next/font/google)
- **What:** Variable sans-serif font by Vercel
- **Why:** Loaded via `next/font/google` for zero layout shift; applied via CSS variable `--font-geist-sans`
- **No signup needed** — loaded at build time via Google Fonts CDN

---

## Backend / Infrastructure services

These are managed by the **backend team** — the frontend only consumes their APIs.

### Railway
- **What:** Backend hosting platform (Node.js / Express API)
- **Signup:** https://railway.app
- **Admin URL:** https://railway.app/dashboard
- **Frontend touches:** `NEXT_PUBLIC_API_URL` points here
- **Note:** All API requests go to `https://api-production-4804.up.railway.app/api/v1`

### Supabase
- **What:** PostgreSQL database + auth + storage
- **Signup:** https://supabase.com
- **Admin URL:** https://app.supabase.com
- **Frontend touches:** Never directly — backend uses Supabase client with service role key
- **Note:** RLS (Row Level Security) policies must allow admin role for insert/update on manuals and past_questions tables (see BUGS.md)

### Fapshi
- **What:** Cameroonian mobile money payment gateway (MTN/Orange)
- **Signup:** https://fapshi.com
- **Frontend touches:** None — backend processes payments and stores results
- **Note:** Used for subscription and per-topic purchases

### MeSomb
- **What:** Alternative mobile money gateway (Cameroon)
- **Signup:** https://mesomb.hachther.com
- **Frontend touches:** None — backend only
- **Note:** Used as secondary gateway; `gateway` field on `Payment` object is `'fapshi' | 'mesomb'`

---

## Deployment services

### Vercel
- **What:** Frontend hosting — automatic builds from Git, edge CDN
- **Signup:** https://vercel.com
- **Recommended plan:** Hobby (free) for staging; Pro for production
- **Setup:** See [SCALE/DEPLOYMENT.md](../SCALE/DEPLOYMENT.md)

---

## Dev tooling

| Tool | Purpose | Version |
|------|---------|---------|
| ESLint | Linting | `^9` + `eslint-config-next` |
| TypeScript compiler | Type checking at build | `^5` |
| PostCSS | CSS transforms (Tailwind pipeline) | via `@tailwindcss/postcss ^4` |

---

## Not used (removed)

| Package | Why removed |
|---------|------------|
| MUI (`@mui/material`) | Listed in `package.json` but fully replaced by Tailwind CSS — all MUI imports have been eliminated. Can be uninstalled: `npm uninstall @mui/material @mui/icons-material @emotion/react @emotion/styled` |
