# DigiManual Admin Panel — Feature Reference

**Base URL:** `https://api-production-4804.up.railway.app/api/v1`  
**Auth:** All requests require `Authorization: Bearer <token>` (set automatically by the Axios interceptor in `lib/api/client.ts`).  
**Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · TanStack Query v5 · Zustand auth

---

## Navigation Structure

```
Dashboard
├── Content
│   ├── Manuals          /dashboard/content/manuals
│   ├── Practicals       /dashboard/content/practicals
│   └── Past Papers      /dashboard/content/past-questions
├── People
│   ├── Users            /dashboard/students
│   └── Mentors          /dashboard/mentors
├── Revenue
│   └── Payments         /dashboard/payments
├── Engagement
│   ├── Discounts        /dashboard/discounts
│   ├── Support          /dashboard/support
│   └── Study Groups     /dashboard/groups
└── Platform
    ├── Notifications    /dashboard/notifications
    └── Settings         /dashboard/settings
```

---

## 1. Dashboard — `/dashboard`

**Overview page.** Shows real-time platform health at a glance.

### What it shows
- **6 stat cards:** Total Users, Active Students, Total Revenue (XAF), Active Manuals, Mentor Applications (pending), Open Support Tickets
- **Recent Payments table:** last transactions with user name, amount, status badge
- **Revenue chart:** income/expense breakdown (Recharts)

### API calls
| Endpoint | Purpose |
|----------|---------|
| `GET /admin/dashboard` | All stat cards + recent activity |
| `GET /admin/payments/stats` | Revenue totals for chart |

---

## 2. Study Manuals — `/dashboard/content/manuals`

**Full CRUD for GCE study guide books.** Two pages: List and Detail/Editor.

### 2a. Manuals List

**What it shows**
- 4 stat cards: Total Manuals, Published, Premium, Total Views
- Filter bar: search by title/subject, Level dropdown (O-Level / A-Level / Both), Language dropdown (English / French / Bilingual), All / Published / Draft toggle pills
- Table with cover thumbnail, subject badge, level/language/status pills, view count
- Three-dot action menu per row: Edit, View Topics, Toggle Publish, Delete

**Actions**
| Action | API call |
|--------|---------|
| Create manual (with cover + PDF upload) | `POST /admin/manuals` (multipart/form-data) |
| Toggle publish | `PATCH /admin/manuals/:id/publish` |
| Delete manual | `DELETE /admin/manuals/:id` |

**Create Modal fields:** Title, Subject, Level (pill selector), Language (pill selector), Description, Tags (chip input), Cover Image upload, Full PDF upload, Premium toggle.

### 2b. Manual Detail / Topic Editor — `/dashboard/content/manuals/:id`

**Two-column layout:** 65% topics (left) + 35% sticky settings panel (right).

**Left column — Topics**
- Topics listed as draggable cards (HTML5 drag-and-drop)
- Each card shows: content type, estimated time, difficulty badge, free/premium badge
- Per-card actions: Edit (inline expandable form), Upload Media, Delete
- Drag to reorder → `PATCH /admin/manuals/:manualId/topics/:id` with new `order_index`
- **Add Topic** opens inline form (not a modal)

**Topic form fields:** Title, Description, Content Body (monospace textarea), Content Type (Text/PDF/Mixed), Difficulty (Beginner/Intermediate/Advanced), Estimated Time, Order Position, Premium toggle, Individual Price (shown when premium)

**Right column — Settings panel**
| Section | What it does |
|---------|-------------|
| Publish button | Publishes or unpublishes the manual |
| Cover Image | Clickable preview → file picker → `POST /admin/manuals/:id/cover` |
| Full PDF | File picker → `POST /admin/manuals/:id/pdf` |
| Details | Editable title, subject, level, language, tags, premium toggle → `PATCH /admin/manuals/:id` |
| Danger Zone | Delete manual with confirm dialog → `DELETE /admin/manuals/:id` |

**API calls**
| Endpoint | Purpose |
|----------|---------|
| `GET /admin/manuals/:id` | Load manual metadata |
| `GET /admin/manuals/:id/topics` | Load topics |
| `POST /admin/manuals/:id/topics` | Create topic |
| `PATCH /admin/manuals/:manualId/topics/:id` | Update or reorder topic |
| `DELETE /admin/manuals/:manualId/topics/:id` | Delete topic |
| `POST /admin/manuals/:id/cover` | Upload cover image |
| `POST /admin/manuals/:id/pdf` | Upload full PDF |
| `PATCH /admin/manuals/:id` | Update manual metadata |
| `PATCH /admin/manuals/:id/publish` | Toggle publish |
| `DELETE /admin/manuals/:id` | Delete manual |
| `POST /admin/manuals/:manualId/topics/:id/media` | Upload topic media |

---

## 3. Practical Workbooks — `/dashboard/content/practicals`

**Full editorial system for GCE lab workbooks.** Three pages: List, Create, Editor.

### 3a. Practicals List

- Stats: Total, Published, Draft, Premium
- Table: title, subject template badge (color-coded), manual link, difficulty, total marks, publish toggle, actions
- Publish toggle fires inline without navigation
- Delete with confirm dialog

### 3b. Create Practical — `/dashboard/content/practicals/new`

**Template selector** (clickable cards with icons):
| Template | Icon | Sections auto-created |
|----------|------|----------------------|
| `chemistry_al` | Flask | 14 (Apparatus, Reagents, Procedure, Observations, Calculations, Equations, Errors, Viva, Conclusion…) |
| `physics_al` | Atom | 14 (Diagram, Tables, Graph, Calculations, Observations, Errors, Questions, Conclusion…) |
| `biology` | Leaf | 9 (Observation, Drawing, Labels, Questions, Conclusion…) |
| `computer_science` | Code | 9 (Algorithm, Flowchart, Pseudocode, Code, Trace Table, Test Cases, Reflection…) |
| `generic` | Document | 4 (Questions, Conclusion…) |

**Other fields:** Title, Manual (dropdown), Chapter (dropdown — loads when manual is selected), Estimated Time, Difficulty, Premium toggle, Price (shown when premium).

On submit → `POST /admin/practicals` → redirects to the editor with the scaffolded sections pre-loaded.

### 3c. Practical Editor — `/dashboard/content/practicals/:id`

**Layout:** top bar (title + publish button) + 4 tabs.

#### Tab 1 — Sections
- **Left sidebar:** draggable section pills (`@dnd-kit/sortable`) — reorder fires `PATCH /admin/practicals/:id/sections/reorder`
- **Right panel:** section content editor (type-specific widget, auto-detected from `section.type`)
- **Auto-save:** 800ms debounce on every field change → `PATCH /admin/sections/:id` — shows `Saved ✓` indicator

**Section header controls (on every section):**
- Editable label, Student Fillable toggle, Premium toggle, Max Marks input, Delete with confirm

**13 section type editors:**

| Type | Widget |
|------|--------|
| `rich_text` | Multi-line textarea (supports HTML) — for Overview, Aim, Theory, Procedure, Precautions |
| `checklist` | Dynamic list builder (add/remove items) — for Apparatus, Reagents |
| `table` | Column header builder + row count + live table preview — for Observation/Measurement Tables, Trace Tables |
| `graph` | X/Y axis labels + units + scale (linear/log) + grid size + trend note — for Physics graphs |
| `calculation` | Formula input + description + steps hint — for Calculations |
| `equation` | Multiple equation inputs + "student must write" toggle — for Chemical Equations |
| `image` | File dropzone → `POST /admin/sections/:id/media` + caption — for Biology specimens, Physics diagrams |
| `drawing` | Instructions textarea + optional reference image upload — for Biology drawings |
| `mcq` | Questions panel: question text + 4 options + correct answer radio + marks → `POST /admin/sections/:id/questions` |
| `short_answer` | Questions panel: question text + model answer textarea + marks |
| `long_answer` | Prompt textarea + minimum word count — for Conclusion, Reflection |
| `code` | Language selector (Python/Java/Pascal/C/Pseudocode) + starter code editor + instructions |
| `flowchart` | Instructions textarea + expected node count |

#### Tab 2 — Rubrics
- List of AI grading criteria (each with criterion name, description, max marks)
- Inline edit per rubric card
- Total marks auto-summed and displayed
- **Publish guard:** if publishing with 0 rubrics, shows a warning — the AI grader requires at least one criterion
- `POST /admin/practicals/:id/rubrics` · `PATCH /admin/rubrics/:id` · `DELETE /admin/rubrics/:id`

#### Tab 3 — Submissions
- Filter tabs: Submitted / Graded / In Progress → `GET /admin/practicals/:id/attempts?status=...`
- Table: student name, phone, status badge, submitted date, score
- Click any row → **Attempt Detail view:**
  - Student info + submitted date
  - AI Grading Report: summary text + per-criterion breakdown (marks awarded / max marks + comment)
  - Download PDF button (links to `pdf_url`)

#### Tab 4 — Settings
- Edit title, estimated time, difficulty, premium toggle, price
- Large Publish / Unpublish button
- **Danger Zone:** delete with title-text confirmation (must type exact title) → `DELETE /admin/practicals/:id`

**API calls**
| Endpoint | Purpose |
|----------|---------|
| `GET /admin/practicals` | List all practicals |
| `POST /admin/practicals` | Create (auto-scaffolds sections) |
| `GET /admin/practicals/:id` | Load practical + sections + rubrics |
| `PATCH /admin/practicals/:id` | Update metadata |
| `PATCH /admin/practicals/:id/publish` | Toggle publish |
| `DELETE /admin/practicals/:id` | Delete practical |
| `PATCH /admin/sections/:id` | Update section content/settings (auto-saved) |
| `DELETE /admin/sections/:id` | Delete section |
| `PATCH /admin/practicals/:id/sections/reorder` | Save new drag-drop order |
| `POST /admin/sections/:id/media` | Upload image/diagram to section |
| `POST /admin/sections/:id/questions` | Add MCQ or short-answer question |
| `DELETE /admin/questions/:id` | Delete question |
| `POST /admin/practicals/:id/rubrics` | Add rubric criterion |
| `PATCH /admin/rubrics/:id` | Update rubric |
| `DELETE /admin/rubrics/:id` | Delete rubric |
| `GET /admin/practicals/:id/attempts` | List student submissions |

---

## 4. Past Papers — `/dashboard/content/past-questions`

**Upload and manage GCE past examination papers.**

### What it shows
- Filter bar: Level (O-Level / A-Level), Subject text search, Year filter
- Table: exam title, subject, level, year, verified badge, solution badge, actions

### Actions
| Action | How |
|--------|-----|
| Upload past paper | Modal form → `POST /admin/past-questions` (multipart/form-data with PDF file) |
| Upload solution | File picker on each row → `POST /admin/past-questions/:id/solution` |
| Mark as verified | Toggle → `PATCH /admin/past-questions/:id/verify` |
| Delete | Confirm dialog → `DELETE /admin/past-questions/:id` |

**Create form fields:** Exam Title, Subject, Level, Exam Year, PDF file (required), Solution PDF (optional — can upload later).

> **Note:** Backend requires the PDF file in the initial `POST` request (not a separate upload). Send as `multipart/form-data`.

---

## 5. Users — `/dashboard/students`

**View and manage all platform users (students, mentors, admins).**

### What it shows
- Role tabs: All Users / Students / Mentors
- Search input
- Table: display name, email, level/school, role badge, status badge (Active / Suspended), join date
- Empty state per role tab

### Actions
| Action | API call |
|--------|---------|
| Activate / Suspend user | `PATCH /admin/users/:id/activate` with `{ isActive: bool }` |
| Change role | `PATCH /admin/users/:id/role` with `{ role }` |
| Grant subscription | Modal: plan (Basic/Premium) + days → `POST /admin/users/:id/grant-subscription` |

### API calls
- `GET /admin/users?role=student|mentor|admin&search=...&page=...` — list with pagination

---

## 6. Mentors — `/dashboard/mentors`

**Review mentor applications and manage approved mentors.**

### What it shows
- Status tabs: **Pending** / **Approved** / **Rejected** / **Suspended** / **All**
- Table: name, subject, qualifications, status badge, earnings (XAF), pending payout
- Context-aware action buttons:
  - Pending → Approve / Reject (with reason)
  - Approved → Suspend
  - Suspended → Reinstate

### Actions
| Action | API call |
|--------|---------|
| Approve | `POST /admin/mentors/:id/approve` |
| Reject | `POST /admin/mentors/:id/reject` with `{ reason }` |
| Suspend | `POST /admin/mentors/:id/suspend` with `{ reason }` |
| Process payout | Modal: amount + phone + service → `POST /admin/mentors/:id/payout` |

### API calls
- `GET /admin/mentors/pending` — pending applications
- `GET /admin/mentors?status=approved|rejected|suspended` — filtered list

---

## 7. Payments — `/dashboard/payments`

**View all transactions and revenue analytics.**

### What it shows
- Stats: Total Revenue (XAF), Today's Revenue, This Month, Total Transactions
- Filter bar: date range, status (success / pending / failed)
- Transactions table: user, amount (XAF), plan, payment method, status badge, date

### API calls
- `GET /admin/payments?page=&startDate=&endDate=&status=` — paginated transactions
- `GET /admin/payments/stats` — revenue totals

> **Backend note:** The payments endpoint has a known Supabase FK ambiguity bug (multiple relationships between `payments` and `users`). The backend developer needs to add a FK hint to the Supabase query: `.select('*, users!payments_user_id_fkey(*)')`.

---

## 8. Discounts — `/dashboard/discounts`

**Create and manage discount codes. Auto-reward leaderboard toppers.**

### What it shows
- Table: code, type (percentage / fixed), value, usage count vs limit, expiry, active status toggle
- Per-row: toggle active, delete

### Actions
| Action | API call |
|--------|---------|
| Create discount code | Modal form → `POST /admin/discounts` |
| Toggle active/inactive | `PATCH /admin/discounts/:id/toggle` |
| Delete code | `DELETE /admin/discounts/:id` |
| Auto-reward top students | Form: top N + discount % + expiry days → `POST /admin/discounts/leaderboard-reward` |

**Create form fields:** Code (or auto-generate), Type (percentage / fixed XAF), Value, Max Uses, Expiry Date, Description.

---

## 9. Support — `/dashboard/support`

**Manage helpdesk tickets from students.**

### What it shows
- Filter tabs: Open / In Progress / Resolved / All
- Table: subject, student, priority badge, status badge, opened date, reply count
- Click a row → **Ticket Detail view:** full conversation thread, reply box

### Actions
| Action | API call |
|--------|---------|
| Reply to ticket | `POST /admin/support/:id/reply` with `{ message }` |
| Change priority | `PATCH /admin/support/:id/priority` with `{ priority }` |

Priority levels: `low` / `medium` / `high` / `urgent` — shown as color-coded badges.

---

## 10. Study Groups — `/dashboard/groups`

**View and manage student study groups.**

### What it shows
- Groups list/table: group name, subject, member count, created by, created date
- Create Group button

### Actions
| Action | API call |
|--------|---------|
| Create group | Modal: name, subject, description, level → `POST /admin/groups` |
| Send announcement | Modal: message text → `POST /admin/groups/:id/announce` with `{ content: message }` |

> **Important:** The announce endpoint expects the field named `content`, not `message`.

---

## 11. Notifications — `/dashboard/notifications`

**Broadcast push notifications to all users or filtered segments.**

### Actions
| Action | API call |
|--------|---------|
| Broadcast notification | Form: title + body + target audience → `POST /admin/notifications/broadcast` |

Response includes `{ sent: number }` — count of devices notified.

---

## 12. Platform Settings — `/dashboard/settings`

**Configure platform-wide pricing and AI limits. Changes apply within ~10 minutes (server cache TTL).**

### Configurable settings
| Setting key | Label | Unit |
|-------------|-------|------|
| `subscription_basic_price` | Basic Plan Price | XAF/month |
| `subscription_premium_price` | Premium Plan Price | XAF/month |
| `topic_default_price` | Default Topic Price | XAF |
| `mentor_commission_percent` | Mentor Commission | % |
| `ai_limit_free` | AI Limit — Free | questions/month |
| `ai_limit_basic` | AI Limit — Basic | questions/month |
| `ai_limit_premium` | AI Limit — Premium | questions/month (set `-1` for unlimited) |
| `past_q_free_views` | Free Past Question Views | per month |
| `discount_leaderboard_top` | Leaderboard Auto-Reward Top N | students |

Each setting has its own **Save** button (only enabled when the value has changed). AI limit settings have an "Unlimited" checkbox that sets the value to `-1`.

### API calls
- `GET /admin/config` — loads current config (response can be an array of `{key, value}` pairs or a flat object — the frontend handles both shapes via `normalizeConfig()`)
- `POST /admin/config` with `{ key, value }` — saves a single setting

---

## Technical Notes

### Auth flow
- Access token stored in Zustand memory (not localStorage)
- Refresh token in `localStorage`
- Axios interceptor in `lib/api/client.ts` attaches the Bearer token automatically and handles 401 refresh

### API response shape
All API responses follow:
```json
{ "success": true, "message": "...", "data": { ... }, "timestamp": "..." }
```
All pages use defensive `extractX(raw)` functions that try multiple response shape keys (`data`, `items`, named keys like `manuals`, `users`, etc.) before falling back to empty arrays. This prevents blank pages if the API response format varies.

### File uploads
All file uploads use `multipart/form-data`. The Axios call must include `{ headers: { 'Content-Type': 'multipart/form-data' } }`.

### Known backend bugs (awaiting fix)
1. **Payments 500 error** — Supabase FK ambiguity in `admin.controller.js:462`. Fix: use `.select('*, users!payments_user_id_fkey(*)')`.
2. **Manuals RLS error** — `new row violates row-level security policy for table 'manuals'`. Fix: use the Supabase service role client (not the anon client) for admin write operations, or add an RLS policy that allows inserts when `auth.jwt()->>'role' = 'admin'`.
3. **Past Questions RLS error** — same RLS issue as manuals, applies to the `past_questions` table.
