# DigiManual Admin Panel — Full Audit Report

> Generated: 2026-06-27

---

## Summary

The repo is a **Next.js admin panel shell** with no real API integration whatsoever. Every page uses static mock data. The auth flow is a demo simulation. The wrong stack was used (MUI instead of Tailwind/shadcn). Entire codebase must be rebuilt to spec.

---

## Critical Structural Problems

| # | Problem | Severity |
|---|---------|----------|
| 1 | **Mock login** — `login/page.tsx` has `TODO: Replace with actual API call` and uses a mock token | CRITICAL |
| 2 | **No real auth** — `useUserStore` persists token to localStorage (should be memory-only for accessToken) and never calls `POST /auth/login` | CRITICAL |
| 3 | **No token refresh** — Axios client redirects to `/login` on 401 instead of calling `POST /auth/refresh` and retrying | CRITICAL |
| 4 | **Wrong role check** — `ProtectedRoute` only checks `isAuthenticated`, never checks `user.role === 'admin'` | CRITICAL |
| 5 | **Wrong tech stack** — Using MUI (`@mui/material`) instead of Tailwind CSS + shadcn/ui as specified | HIGH |
| 6 | **No TanStack Query** — No `@tanstack/react-query` installed; no server state management at all | HIGH |
| 7 | **No `.env` file** — `NEXT_PUBLIC_API_URL` not configured; client.ts falls back to `localhost:3000` | CRITICAL |

---

## Mock Data Files — ALL TO DELETE

These files exist solely to power demo UIs. None are connected to the real API.

- `lib/data/mockStudents.ts` — DELETE
- `lib/data/mockManuals.ts` — DELETE
- `lib/data/mockFinance.ts` — DELETE
- `lib/data/mockActivityLogs.ts` — DELETE
- `lib/data/mockAdmins.ts` — DELETE
- `lib/data/mockBlogs.ts` — DELETE
- `lib/data/mockComments.ts` — DELETE
- `lib/data/mockFAQs.ts` — DELETE
- `lib/data/mockHelpdesk.ts` — DELETE
- `lib/data/mockQuestions.ts` — DELETE
- `lib/data/mockStudentActivity.ts` — DELETE

---

## Pages — Status Per Screen

### Routes That Exist But Must Be Completely Rebuilt

| Page | Current State | Required API | Status |
|------|--------------|--------------|--------|
| `/login` | Mock login, any credentials work | `POST /auth/login` | ❌ REBUILD |
| `/dashboard` | Hardcoded stats (1,234 / 456 / 23 / 89), mock charts, mock users table | `GET /admin/dashboard` + `GET /admin/payments/stats` | ❌ REBUILD |
| `/dashboard/students` | Mock data, wrong model (Student vs UserProfile), no real CRUD | `GET /admin/users`, role/activate/grant-sub endpoints | ❌ REBUILD |
| `/dashboard/students/[id]` | Mock StudentDetailView | User detail + payments + activity | ❌ REBUILD |
| `/dashboard/content/manuals` | Mock data, local state mutations only | `GET /admin/manuals` + full CRUD | ❌ REBUILD |
| `/dashboard/content/manuals/[id]/edit` | Exists as route | `PATCH /admin/manuals/:id` | ❌ REBUILD |
| `/dashboard/content/manuals/create` | Exists as route | `POST /admin/manuals` | ❌ REBUILD |
| `/dashboard/finance` | Mock finance transactions (USD!), wrong model entirely | `GET /admin/payments` + `GET /admin/payments/stats` | ❌ REBUILD |
| `/dashboard/settings` | Hardcoded SMTP / generic settings, fake save | `GET /admin/config` + `POST /admin/config` | ❌ REBUILD |
| `/dashboard/helpdesk` | Unknown — likely mock | `GET /admin/support` + reply/priority endpoints | ❌ REBUILD |
| `/dashboard/questions` | Unknown — likely mock | Topics MCQ endpoints | ❌ REBUILD |
| `/dashboard/admins` | Unknown — likely mock | No admin CRUD endpoint in spec | ❌ DELETE OR STUB |
| `/dashboard/blogs` | Unknown — likely mock | No blogs endpoint in spec | ❌ DELETE |
| `/dashboard/comments` | Unknown — likely mock | No comments endpoint in spec | ❌ DELETE |
| `/dashboard/faqs` | Unknown — likely mock | No FAQs endpoint in spec | ❌ DELETE |
| `/dashboard/activity-logs` | Unknown — likely mock | No activity logs endpoint in spec | ❌ DELETE |

### Routes Missing Entirely (Must Be Built)

| Route | Required |
|-------|---------|
| `/dashboard/content/past-questions` | `GET /admin/past-questions` list, upload, verify |
| `/dashboard/mentors` | `GET /admin/mentors/pending`, approve/reject/suspend/payout |
| `/dashboard/mentors/[id]` | Mentor profile detail |
| `/dashboard/payments` | `GET /admin/payments` transactions table |
| `/dashboard/payments/stats` | Revenue charts from `GET /admin/payments/stats` |
| `/dashboard/discounts` | `GET /admin/discounts` + create/toggle/delete/leaderboard |
| `/dashboard/support` | Tickets split-view + reply + priority |
| `/dashboard/groups` | Study groups list + create + moderation |
| `/dashboard/notifications` | Broadcast form |

---

## Component Issues

| Component | Problem |
|-----------|---------|
| `components/auth/ProtectedRoute.tsx` | Missing `user.role === 'admin'` check |
| `components/layout/Sidebar.tsx` | Wrong nav items (Blogs, Comments, FAQs, Activity Logs, Admins not in spec); missing Mentors, Payments, Discounts, Support, Groups, Notifications; no pending badge on Mentors; no open-ticket badge on Support |
| `components/charts/*` | All charts use mock/hardcoded data — UsersGrowthChart, MostAccessedManualsChart, ActiveUsersPie, GenderDistributionPie, SessionTimeAreaChart, IncomeExpenseChart, ExpenseCategoryChart all need to be replaced with API-driven charts |
| `components/manuals/ManualForm.tsx` | Uses mock Manual type, no file upload, no API call |
| `components/manuals/ManualDetailView.tsx` | Uses mock data |
| `components/students/StudentForm.tsx` | Uses mock Student type — wrong model |
| `components/students/StudentDetailView.tsx` | Uses mock data |
| `components/blogs/*` | BlogForm, BlogDetailView — DELETE (no blogs endpoint) |
| `lib/api/client.ts` | No token refresh on 401; reads token from localStorage directly instead of Zustand store; uses `any` types |
| `lib/stores/userStore.ts` | Persists token to localStorage (accessToken should be in memory only per spec); missing `refreshToken` field and `refreshToken()` action |
| `lib/types/manual.ts` | Wrong shape — doesn't match API `Manual` interface |
| `lib/types/student.ts` | Wrong shape — doesn't match API `UserProfile` interface |
| `lib/types/finance.ts` | Entirely wrong model — uses USD, income/expense categories not in spec |

---

## Currency / Formatting Violations

- `finance/page.tsx` uses `Intl.NumberFormat` with `currency: 'USD'` — must be XAF formatted as `1,500 XAF`
- `settings/page.tsx` shows USD prices (`9.99`, `99.99`) — must be XAF prices from `GET /admin/config`

---

## Missing Infrastructure

| Item | Status |
|------|--------|
| `.env.local` with `NEXT_PUBLIC_API_URL` | MISSING |
| `@tanstack/react-query` package + QueryClientProvider | NOT INSTALLED |
| Zustand auth store (with accessToken in memory + refreshToken in localStorage) | MISSING |
| Axios interceptor with token refresh + retry | MISSING |
| XAF currency formatter utility | MISSING |
| Loading skeleton components | MISSING |
| shadcn/ui components | NOT INSTALLED |
| TanStack Table | NOT INSTALLED |
| react-dropzone (file uploads) | NOT INSTALLED |
| date-fns | NOT INSTALLED |
| `NEXT_PUBLIC_API_URL` usage everywhere | MISSING |

---

## Build Order

- [x] Audit complete — this document
- [ ] 1. Install missing packages (`@tanstack/react-query`, `@tanstack/react-table`, `react-dropzone`, `date-fns`, shadcn/ui or manual Tailwind components)
- [ ] 2. Create `.env.local` with `NEXT_PUBLIC_API_URL`
- [ ] 3. Delete all mock data files + dead pages (blogs, comments, faqs, activity-logs, admins)
- [ ] 4. Rebuild `lib/api/client.ts` — proper Axios with token refresh interceptor
- [ ] 5. Rebuild `lib/stores/authStore.ts` — accessToken in memory, refreshToken in localStorage, login/logout/refresh actions
- [ ] 6. Rebuild `ProtectedRoute` — check `user.role === 'admin'`
- [ ] 7. Rebuild `lib/types/` — correct API shapes (Manual, UserProfile, MentorProfile, Payment, etc.)
- [ ] 8. Rebuild Login page — real `POST /auth/login`, admin role check
- [ ] 9. Rebuild Sidebar — correct nav items, pending badges
- [ ] 10. Rebuild Dashboard — real data from `GET /admin/dashboard` + `GET /admin/payments/stats`
- [ ] 11. Rebuild Users page → `GET /admin/users`, role change, activate, grant subscription
- [ ] 12. Rebuild Manuals → Topics → Questions (full CRUD + file uploads)
- [ ] 13. Build Past Questions page
- [ ] 14. Build Mentors page
- [ ] 15. Rebuild Payments → stats charts
- [ ] 16. Build Discounts page
- [ ] 17. Rebuild Support (split-view tickets)
- [ ] 18. Build Groups page
- [ ] 19. Build Notifications page
- [ ] 20. Rebuild Settings / Platform Config page

---

## Items That Cannot Be Fixed

| Item | Reason |
|------|--------|
| `Blogs`, `Comments`, `FAQs`, `Activity Logs` sections | No API endpoints exist in the spec for these. Pages must be deleted. |
| `Admins` section | No admin CRUD endpoint in spec. Page must be deleted. |
| Gender distribution chart | API returns no gender data. Chart must be removed. |
| Session time chart | API returns no session time data. Chart must be removed. |
| User growth over time chart | `GET /admin/dashboard` doesn't return monthly user counts. This specific chart cannot be built without a new API endpoint. Remove or show total count only. |
