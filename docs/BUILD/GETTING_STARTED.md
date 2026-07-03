# Getting Started

## Prerequisites

| Tool | Minimum version | Check |
|------|----------------|-------|
| Node.js | 18.17+ | `node -v` |
| npm | 9+ | `npm -v` |
| Git | any | `git --version` |

---

## Setup in 5 steps

```bash
# 1. Clone
git clone <repo-url>
cd digimanual_

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local
# Then edit .env.local — see ENV_REFERENCE.md

# 4. Start dev server
npm run dev

# 5. Open
# http://localhost:3000
```

The login page is at `/login`. The dashboard is at `/dashboard` (requires auth).

---

## npm scripts

| Script | What it does |
|--------|-------------|
| `npm run dev` | Starts Next.js dev server with hot reload on `:3000` |
| `npm run build` | Builds for production (runs type-check + compile) |
| `npm run start` | Serves the production build locally |
| `npm run lint` | Runs ESLint on all files |

---

## Project structure

```
digimanual_/
│
├── app/                            # Next.js 16 App Router
│   ├── globals.css                 # Tailwind base + CSS variables
│   ├── layout.tsx                  # Root layout: Geist font + QueryProvider
│   ├── login/
│   │   └── page.tsx                # Public login form
│   └── dashboard/
│       ├── layout.tsx              # DashboardLayout: Sidebar + Topbar wrapper
│       ├── page.tsx                # Dashboard home — stats + recent activity
│       ├── content/
│       │   ├── manuals/
│       │   │   ├── page.tsx        # Manual list + create modal
│       │   │   └── [manualId]/
│       │   │       └── page.tsx    # Topic editor + settings panel
│       │   ├── practicals/
│       │   │   ├── page.tsx        # Practicals list
│       │   │   ├── new/
│       │   │   │   └── page.tsx    # Template selector + create form
│       │   │   └── [practicalId]/
│       │   │       └── page.tsx    # Full editor: Sections / Rubrics / Submissions / Settings
│       │   └── past-questions/
│       │       └── page.tsx        # Past papers list + upload
│       ├── students/
│       │   └── page.tsx            # User management
│       ├── mentors/
│       │   └── page.tsx            # Mentor approval + payouts
│       ├── payments/
│       │   └── page.tsx            # Revenue transactions
│       ├── discounts/
│       │   └── page.tsx            # Promo codes + leaderboard reward
│       ├── support/
│       │   └── page.tsx            # Helpdesk tickets + reply thread
│       ├── groups/
│       │   └── page.tsx            # Study groups + announcements
│       ├── notifications/
│       │   └── page.tsx            # Push broadcast form
│       └── settings/
│           └── page.tsx            # Platform config (9 settings)
│
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx      # Reads Zustand auth, redirects to /login if missing
│   ├── layout/
│   │   ├── DashboardLayout.tsx     # Flex row: Sidebar + main content area
│   │   ├── Sidebar.tsx             # Nav items, badges, collapse, mobile drawer
│   │   └── Topbar.tsx              # Page breadcrumb, mobile menu button
│   ├── practicals/
│   │   └── SectionEditor.tsx       # 13 section type editors + auto-save hook
│   └── providers/
│       └── QueryProvider.tsx       # TanStack Query client provider
│
├── lib/
│   ├── api/
│   │   └── client.ts               # Axios instance, request interceptor (Bearer token),
│   │                               # response interceptor (401 → refresh → retry)
│   ├── stores/
│   │   ├── authStore.ts            # Zustand: accessToken (memory) + user
│   │   └── sidebarStore.ts         # Zustand: isCollapsed, isOpen (mobile)
│   ├── types/
│   │   └── api.ts                  # TypeScript interfaces for all API shapes
│   └── utils.ts                    # formatXAF, formatDate, getErrorMessage, cn
│
├── docs/                           # This documentation
├── ADMIN_FEATURES.md               # Feature summary (legacy)
├── ADMIN_FLOW.md                   # Step-by-step admin walkthrough (legacy)
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── .env.local                      # ← you create this (not committed)
```

---

## Key conventions

### Page anatomy
Every dashboard page follows this structure:
```tsx
export default function XxxPage() {
  // 1. State (filters, modals, pagination)
  // 2. useQuery (data fetch)
  // 3. useMutation(s) (actions)
  // 4. extract() helper (defensive API parse)
  // 5. JSX: header → stat cards → filters → table → modals
}
```

### Defensive API parsing
All pages use an `extract(raw)` function that tries multiple response keys before returning `[]`:
```ts
function extract(raw: unknown): Foo[] {
  const r = raw as Record<string, unknown>;
  const list = r['foos'] ?? r['data'] ?? r['items'];
  if (Array.isArray(list)) return list as Foo[];
  if (Array.isArray(raw)) return raw as Foo[];
  return [];
}
```
This prevents blank pages when the API format varies.

### File uploads
All file uploads use `multipart/form-data`:
```ts
const fd = new FormData();
fd.append('field', file);
await api.post('/endpoint', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
```

---

## Common issues

| Problem | Fix |
|---------|-----|
| Blank page after login | Check `NEXT_PUBLIC_API_URL` in `.env.local` |
| 401 loops on every request | Verify the API URL includes `/api/v1` |
| TypeScript error on `manual.tags` | Already typed as `string[]` — no cast needed |
| `dnd-kit` hydration warning | Wrap DndContext in `mounted` check |
| Tailwind classes not applying | Run `npm run dev` fresh; Tailwind v4 uses new JIT |
