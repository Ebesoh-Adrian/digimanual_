# System Overview

## What this app is

DigiManual Admin is a **Next.js 16 single-page admin dashboard** for managing the DigiManual GCE exam-prep platform. It is a pure frontend — it has no database connection, no server actions, and no backend logic. Every data operation goes through the REST API hosted on Railway.

```
Browser (Admin)
    │
    ├─── Next.js app (Vercel CDN)
    │        └── React components + Zustand state
    │
    └─── REST API (Railway)
             └── Express + Supabase (PostgreSQL)
```

---

## Rendering pattern

This app uses the **Client Component pattern** — not React Server Components — because:

1. Every page requires auth state (Zustand, client-only)
2. All data fetching uses TanStack Query (`useQuery`), which is client-side
3. Real-time-like interactions (auto-save, drag-drop, toggles) need client JS

Every page and component is marked `'use client'`. The only server-rendered file is the root `app/layout.tsx`.

```
app/layout.tsx              ← Server Component (font + metadata only)
app/dashboard/layout.tsx    ← 'use client' (reads sidebar store)
app/dashboard/page.tsx      ← 'use client' (useQuery for stats)
components/layout/Sidebar   ← 'use client' (Zustand, router)
```

---

## Auth flow

```
1. Admin opens /dashboard
        │
        ▼
2. <ProtectedRoute> checks useAuthStore.accessToken
        │
        ├── null → redirect to /login
        │
        └── exists → render dashboard
                │
                ▼
3. Every API request: Axios interceptor reads token from Zustand
   and adds  Authorization: Bearer <accessToken>
                │
                ▼
4. On 401 response:
   a. Axios interceptor catches it
   b. Reads digimanual_refresh_token from localStorage
   c. POST /auth/refresh → new accessToken + refreshToken
   d. Stores new accessToken in Zustand
   e. Stores new refreshToken in localStorage
   f. Retries original request with new token
   g. All queued requests during refresh also get the new token
                │
                ▼
5. If refresh fails → logout() → redirect to /login
```

### Token storage rationale

| Token | Location | Reason |
|-------|----------|--------|
| `accessToken` | Zustand memory (JS variable) | Cannot be stolen by XSS — dies with the tab |
| `refreshToken` | `localStorage` key `digimanual_refresh_token` | Survives page refresh so admin stays logged in |

The tradeoff: the access token is lost on page refresh, but the refresh interceptor silently issues a new one within milliseconds using the stored refresh token.

---

## Data flow

```
Component renders
    │
    ├─ useQuery({ queryKey, queryFn })
    │       │
    │       ├─ TanStack Query checks cache (queryKey)
    │       │       │
    │       │       ├─ Cache hit → return cached data immediately
    │       │       │
    │       │       └─ Cache miss → call queryFn
    │       │               │
    │       │               └─ api.get('/admin/...') [Axios]
    │       │                       │
    │       │                       └─ Interceptor adds Bearer token
    │       │                               │
    │       │                               └─ Railway API responds
    │       │
    │       └─ extract(res.data.data) → typed array
    │
    └─ useMutation({ mutationFn, onSuccess, onError })
            │
            ├─ User action → mutate(payload)
            │
            ├─ api.post/patch/delete('/admin/...')
            │
            ├─ onSuccess → queryClient.invalidateQueries(queryKey) → refetch
            │
            └─ onError → toast.error(getErrorMessage(e))
```

### API response shape

All responses follow this envelope:
```json
{
  "success": true,
  "message": "Manuals fetched",
  "data": { ... },
  "timestamp": "2026-07-03T10:00:00Z"
}
```

The frontend reads `res.data.data` (the inner `data` field). The `extract()` helpers handle cases where the inner shape varies.

---

## Component architecture

```
DashboardLayout
├── Sidebar                      ← persistent nav, collapse/expand, badges
│   └── nav items (12 routes)
├── Topbar                       ← page title, mobile hamburger
└── <children>                   ← current page component
        │
        ├── Stat cards
        ├── Filter bar
        ├── Data table (with skeleton loader + empty state)
        └── Modals (portalled to body via fixed positioning)
```

### Shared patterns across all pages

**Skeleton loader:**
```tsx
{isLoading && Array.from({ length: 5 }).map((_, i) => (
  <tr key={i}><td><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
))}
```

**Empty state:**
```tsx
{!isLoading && items.length === 0 && (
  <div className="py-20 text-center">
    <Icon className="mx-auto text-gray-300 mb-3" />
    <p>No items yet</p>
    <button onClick={...}>Create first one</button>
  </div>
)}
```

**Modal pattern:** All modals use `fixed inset-0 bg-black/50 z-50 flex items-center justify-center` overlay with a centred white card.

---

## State management

| Store | File | What it holds |
|-------|------|--------------|
| `authStore` | `lib/stores/authStore.ts` | `accessToken`, `user` (AdminUser), `setAuth`, `setAccessToken`, `logout` |
| `sidebarStore` | `lib/stores/sidebarStore.ts` | `isCollapsed` (desktop), `isOpen` (mobile drawer), `closeMobile`, `setCollapsed` |

TanStack Query acts as the server-state layer — no API data is stored in Zustand.

---

## Font strategy

```ts
// app/layout.tsx
const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

// Applied as:
<body className={`${geist.variable} font-sans antialiased`}>
```

- Loaded via `next/font/google` — zero layout shift, self-hosted at build time
- CSS variable `--font-geist-sans` applied as `font-sans` via Tailwind
- No external font CDN request in production

---

## Error handling strategy

| Layer | How errors are handled |
|-------|----------------------|
| API 401 | Axios interceptor auto-refreshes token and retries |
| API other errors | `useMutation.onError` → `toast.error(getErrorMessage(e))` |
| `getErrorMessage(e)` | Extracts `e.response?.data?.message ?? e.message ?? 'Unknown error'` |
| Query errors | Shown inline when relevant (e.g. Payments page known-bug banner) |
| Empty API responses | `extract()` helper returns `[]` — never throws |
| Type safety | `ApiResponse<unknown>` used when response shape is uncertain |
