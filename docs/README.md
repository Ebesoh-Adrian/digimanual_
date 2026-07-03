# DigiManual Admin — Documentation

**DigiManual** is a GCE Cameroon exam-prep platform (O-Level & A-Level). This folder documents the **admin dashboard** — a Next.js 16 web app that lets an admin manage content, users, revenue, and platform configuration.

**Live API:** `https://api-production-4804.up.railway.app/api/v1`  
**Tech stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · TanStack Query v5 · Zustand v5 · Axios

---

## Quick links

### Build & Setup
| Doc | What's in it |
|-----|-------------|
| [BUILD/GETTING_STARTED.md](BUILD/GETTING_STARTED.md) | Clone → install → run in 5 steps, project structure, all npm scripts |
| [BUILD/ENV_REFERENCE.md](BUILD/ENV_REFERENCE.md) | Every environment variable with type, default, and example |
| [BUILD/THIRD_PARTY_TOOLS.md](BUILD/THIRD_PARTY_TOOLS.md) | All external services used, signup links, what each one does |

### Architecture
| Doc | What's in it |
|-----|-------------|
| [ARCHITECTURE/SYSTEM_OVERVIEW.md](ARCHITECTURE/SYSTEM_OVERVIEW.md) | RSC pattern, auth flow diagram, data flow, font strategy |
| [ARCHITECTURE/DATABASE.md](ARCHITECTURE/DATABASE.md) | All 8 database tables with columns, types, and full SQL setup script |
| [ARCHITECTURE/API.md](ARCHITECTURE/API.md) | Every API route documented with method, endpoint, request body, response shape |

### Features
| Doc | What's in it |
|-----|-------------|
| [FEATURES/CURRENT_FEATURES.md](FEATURES/CURRENT_FEATURES.md) | All 11 feature areas fully documented with UI, actions, and API calls |
| [FEATURES/FUTURE_FEATURES.md](FEATURES/FUTURE_FEATURES.md) | 15 future features across 4 priority tiers with timeline |

### Scale & Deployment
| Doc | What's in it |
|-----|-------------|
| [SCALE/SCALING_GUIDE.md](SCALE/SCALING_GUIDE.md) | 4-phase plan: 0→500→5k→50k→enterprise users, cost table |
| [SCALE/DEPLOYMENT.md](SCALE/DEPLOYMENT.md) | Step-by-step Vercel + Supabase production deploy |

### Operations
| Doc | What's in it |
|-----|-------------|
| [OPERATIONS/BUGS.md](OPERATIONS/BUGS.md) | 6 fixed bugs + 7 open bugs with severity ratings and fix plans |
| [OPERATIONS/CONTRIBUTING.md](OPERATIONS/CONTRIBUTING.md) | Patterns, naming rules, how to add a new feature, gotchas |

---

## Project at a glance

```
digimanual_/
├── app/                        # Next.js App Router pages
│   ├── login/                  # Public auth page
│   └── dashboard/              # Protected admin area
│       ├── page.tsx            # Home / stats overview
│       ├── content/
│       │   ├── manuals/        # Study manual management
│       │   ├── practicals/     # Lab workbook management
│       │   └── past-questions/ # Past paper management
│       ├── students/           # User management
│       ├── mentors/            # Mentor approval + payouts
│       ├── payments/           # Revenue transactions
│       ├── discounts/          # Promo codes
│       ├── support/            # Helpdesk tickets
│       ├── groups/             # Study groups
│       ├── notifications/      # Push broadcasts
│       └── settings/           # Platform config
├── components/
│   ├── auth/                   # ProtectedRoute guard
│   ├── layout/                 # Sidebar, Topbar, DashboardLayout
│   ├── practicals/             # SectionEditor (13 section types)
│   └── providers/              # QueryProvider (TanStack Query)
├── lib/
│   ├── api/client.ts           # Axios instance + token interceptors
│   ├── stores/                 # Zustand: authStore, sidebarStore
│   ├── types/api.ts            # All TypeScript interfaces
│   └── utils.ts                # formatXAF, formatDate, getErrorMessage
└── docs/                       # ← You are here
```

---

## Brand

- **Colour:** Purple — `purple-600` (#7c3aed), `purple-700` (#6d28d9)
- **Font:** Geist Sans (Google Fonts, variable font)
- **Sidebar:** Dark green (`#1b4332`) — deliberate contrast to purple CTAs
- **Border:** `#e2e8f0` throughout

---

## Status

| Area | Status |
|------|--------|
| Auth (login + token refresh) | ✅ Complete |
| Dashboard home | ✅ Complete |
| Manuals (list + editor) | ✅ Complete |
| Practicals (list + create + editor) | ✅ Complete |
| Past Papers | ✅ Complete |
| Users | ✅ Complete |
| Mentors | ✅ Complete |
| Payments | ✅ Complete (API has known bug — see BUGS.md) |
| Discounts | ✅ Complete |
| Support | ✅ Complete |
| Study Groups | ✅ Complete |
| Notifications | ✅ Complete |
| Settings | ✅ Complete |
