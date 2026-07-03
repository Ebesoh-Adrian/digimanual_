# Future Features

15 planned features across 4 priority tiers.

---

## Priority Tier 1 — High Impact, Ship Next (0–3 months)

### 1. Analytics Dashboard v2
**What:** Replace the current basic stat cards with rich charts — MAU trend, subscription conversion funnel, most-accessed manuals, per-subject engagement heatmap.

**Why:** Current dashboard shows totals only. No trends = no insight.

**Implementation notes:**
- New endpoint: `GET /admin/analytics?period=7d|30d|90d`
- Use Recharts `AreaChart`, `BarChart`, `RadarChart`
- Add date range picker to dashboard home
- Store aggregated stats in a `analytics_daily` table (cron job nightly)

**Estimated effort:** 3–5 days

---

### 2. AI Grading Results Export
**What:** From the Submissions tab on any practical, add "Export CSV" — downloads all student attempt scores with per-criterion breakdown.

**Why:** Teachers need this for their grade books. Currently data is locked in the UI.

**Implementation notes:**
- Frontend: add Export button → `GET /admin/practicals/:id/attempts/export?format=csv`
- Backend generates CSV stream
- Use `Content-Disposition: attachment` header
- No new library needed — browser handles the download

**Estimated effort:** 1–2 days

---

### 3. Bulk Manual Operations
**What:** Checkboxes on the manuals table → bulk publish / bulk unpublish / bulk delete.

**Why:** Admin currently has to click each row's 3-dot menu one at a time for batch operations.

**Implementation notes:**
- Add `selectedIds: Set<string>` state
- Header checkbox = select/deselect all on page
- Floating action bar appears when >0 selected: "Publish N | Unpublish N | Delete N"
- New endpoints: `PATCH /admin/manuals/bulk` with `{ ids: [], action: 'publish'|'unpublish'|'delete' }`

**Estimated effort:** 2–3 days

---

### 4. Rich Text Editor (WYSIWYG)
**What:** Replace the plain textarea in the Manuals topic content editor and the `rich_text` section editor with a proper WYSIWYG editor (headings, bold, lists, images inline).

**Why:** Admins currently have to hand-write HTML tags. This is error-prone and slow.

**Implementation notes:**
- Use **Tiptap** (headless, Tailwind-compatible) — `npm install @tiptap/react @tiptap/starter-kit`
- Replace `<textarea>` in `TopicForm` and `RichTextEditor` in SectionEditor
- Output: HTML string (backend already stores HTML in `content` and `sections.content.html`)
- Extension list: Bold, Italic, Heading (H2/H3), BulletList, OrderedList, Link, Image

**Estimated effort:** 3–4 days

---

### 5. Mentor Session Management
**What:** A dedicated page for viewing and managing one-on-one mentor sessions between students and mentors.

**Why:** Currently there's no UI for session history, disputes, or session notes.

**Implementation notes:**
- New route: `/dashboard/sessions`
- Add to sidebar under People section
- Table: Student · Mentor · Subject · Date · Duration · Status · Amount charged
- Actions: Mark completed, Refund, Flag dispute
- Endpoints: `GET /admin/sessions`, `PATCH /admin/sessions/:id`

**Estimated effort:** 3–4 days

---

## Priority Tier 2 — Important, Ship Next Quarter (3–6 months)

### 6. Content Versioning
**What:** Track every edit to a manual topic or practical section. Allow admins to view history and roll back to a previous version.

**Why:** Accidental overwrites or bad edits have no recovery path today.

**Implementation notes:**
- New table: `content_versions` (entity_type, entity_id, content_snapshot JSONB, created_by, created_at)
- Backend middleware: before any PATCH on topics/sections, write a snapshot
- Frontend: "Version history" button on topic editor → slide-out panel showing diffs
- Restore: `POST /admin/topics/:id/restore` with `{ version_id }`

**Estimated effort:** 5–7 days

---

### 7. Student Progress Tracking
**What:** Per-student page showing which manuals they've accessed, topics completed, practicals attempted, AI usage, and subscription history.

**Why:** Admins and support staff need this to answer student queries and spot stuck learners.

**Implementation notes:**
- Expand `/dashboard/students/:id` (currently a stub)
- New endpoint: `GET /admin/users/:id/progress`
- Charts: topic completion over time, subject distribution
- Subscription history timeline

**Estimated effort:** 4–5 days

---

### 8. Push Notification Scheduling
**What:** Schedule broadcasts to fire at a future date/time instead of sending immediately.

**Why:** Useful for exam reminders ("GCE starts in 3 days") sent days in advance.

**Implementation notes:**
- Add datetime picker to the Notifications page
- New endpoint: `POST /admin/notifications/schedule` with `{ title, body, audience, sendAt }`
- Backend: cron/queue (Bull/BullMQ on Railway) processes scheduled items
- Frontend: show list of scheduled notifications with cancel option

**Estimated effort:** 3–4 days

---

### 9. Leaderboard Management
**What:** View and manage the platform leaderboard — top students by points, by subject, by level. Option to manually adjust points or freeze leaderboard during exam season.

**Why:** Leaderboard drives engagement; admins need visibility and control.

**Implementation notes:**
- New route: `/dashboard/leaderboard`
- Endpoints: `GET /admin/leaderboard?level=O-Level&subject=Chemistry`, `PATCH /admin/users/:id/points`
- Freeze mode: `POST /admin/leaderboard/freeze` (hides leaderboard from students during exams)

**Estimated effort:** 3–4 days

---

### 10. Support Ticket Auto-Assignment
**What:** Rules engine to auto-assign tickets to specific admin accounts based on category (payments → finance admin, technical → dev team, etc.).

**Why:** Currently all tickets go into one pool. With multiple admins, this is chaotic.

**Implementation notes:**
- New settings section: Ticket Routing Rules
- Table: Category → Assignee admin user
- Backend tags each new ticket with `assigned_to` UUID on create
- Inbox view: filter by `assigned_to = me` vs all

**Estimated effort:** 4–5 days

---

## Priority Tier 3 — Nice to Have (6–12 months)

### 11. Multi-Admin Role System
**What:** Add granular permissions — e.g. a Content Admin can manage manuals but not see payments; a Finance Admin can see revenue but not delete users.

**Why:** Currently every admin has full access. Compliance and separation of duties require scoping.

**Implementation notes:**
- New table: `admin_roles` (name, permissions JSONB)
- Middleware: `requirePermission('manuals:write')` on each admin route
- Frontend: show/hide pages based on current admin's role
- Settings page to assign roles to admin users

**Estimated effort:** 7–10 days

---

### 12. Exam Paper OCR / Auto-Tagging
**What:** When a past paper PDF is uploaded, run OCR to extract subject, year, and topic tags automatically — pre-fill the upload form.

**Why:** Manual data entry for each paper is slow. There are hundreds of past papers to upload.

**Implementation notes:**
- Backend: use Google Cloud Vision API or AWS Textract on upload
- Extract year (4-digit regex), subject (keyword matching), level (O-Level/A-Level string)
- Frontend: show "AI suggestions" next to form fields with Accept/Edit buttons

**Estimated effort:** 5–7 days + third-party API costs

---

### 13. Revenue Forecasting
**What:** Add a forecasting chart to the payments page showing projected revenue for the next 30/90 days based on active subscriptions and renewal rates.

**Why:** Cash flow visibility for planning infrastructure and payout capacity.

**Implementation notes:**
- Backend: regression model on subscription renewal data
- New endpoint: `GET /admin/payments/forecast?days=30`
- Frontend: dashed-line extension on the existing revenue chart

**Estimated effort:** 4–5 days

---

## Priority Tier 4 — Long-term / Enterprise (12+ months)

### 14. White-Label / Multi-School Tenancy
**What:** Allow different schools or publishers to have their own branded version of DigiManual with separate content libraries and student pools.

**Why:** Schools and textbook publishers have expressed interest in private deployments.

**Implementation notes:**
- New concept: `tenant_id` on every table
- Supabase RLS: enforce `tenant_id = current_tenant_id()` on all reads/writes
- Separate admin dashboards per tenant
- Shared infra, separate data — single Railway deployment

**Estimated effort:** 4–6 weeks

---

### 15. Offline Admin App (PWA)
**What:** Package the admin dashboard as a Progressive Web App so it works offline — useful for admins in low-connectivity areas reviewing content.

**Why:** Cameroon connectivity is variable; admins in rural areas lose work when they lose signal.

**Implementation notes:**
- Add Next.js PWA plugin (`next-pwa`)
- Service worker caches: static assets + last-loaded data per page
- Offline write queue: edits made offline sync when connectivity returns
- IndexedDB for offline storage of cached API responses

**Estimated effort:** 2–3 weeks

---

## Timeline summary

| Quarter | Features |
|---------|---------|
| Q3 2026 (now) | #1 Analytics v2, #2 CSV Export, #3 Bulk Operations, #4 Rich Text Editor, #5 Session Management |
| Q4 2026 | #6 Versioning, #7 Student Progress, #8 Scheduled Notifications, #9 Leaderboard, #10 Ticket Auto-Assignment |
| Q1–Q2 2027 | #11 Multi-Admin Roles, #12 OCR Auto-Tag, #13 Revenue Forecasting |
| 2027+ | #14 White-Label, #15 Offline PWA |
