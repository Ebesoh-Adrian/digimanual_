# Current Features

All 11 admin feature areas, fully documented.

---

## 1. Dashboard Home

**Route:** `/dashboard`

The first screen after login. Gives an instant snapshot of platform health.

### What's shown
| Card | API source |
|------|-----------|
| Total Students | `GET /admin/dashboard` → `stats.totalStudents` |
| Total Mentors | `stats.totalMentors` |
| Active Subscriptions | `stats.activeSubscriptions` |
| Revenue (30 days) | `stats.revenue30Days` (formatted as XAF) |
| Pending Mentor Applications | `stats.pendingMentors` — also drives sidebar badge |
| Total Manuals | `stats.totalManuals` |

- Revenue chart (Recharts area/line chart) — from `GET /admin/payments/stats`
- Recent payments table (last 10 transactions)
- Recent users table (last 10 sign-ups)

---

## 2. Study Manuals

**Routes:** `/dashboard/content/manuals` · `/dashboard/content/manuals/:manualId`

### List page
- 4 stat cards: Total / Published / Premium / Total Views
- Filters: search (title/subject), Level pill toggle, Language pill toggle, Status toggle
- Table columns: Cover thumbnail · Title + subject badge · Level · Language · Topics count · Views · Status · Created · Actions (3-dot menu)
- 3-dot menu: Edit → navigate to detail | View Topics → navigate to detail | Publish/Unpublish (inline) | Delete (confirm modal)
- Pagination (Prev/Next)

### Create Manual modal
- Fields: Title · Subject · Level (pill) · Language (pill) · Cover Image (preview on upload) · Full PDF · Description · Tags (chip input) · Premium toggle
- Sends `multipart/form-data` to `POST /admin/manuals`

### Detail / Topic Editor
**Two-column layout:** 65% topics | 35% sticky settings

**Left — Topics:**
- Add Topic inline form: Title · Description · Content body · Content type · Difficulty · Estimated time · Order position · Premium toggle + Price
- Topic cards: draggable (HTML5 native) · Edit inline · Delete · Upload Media per topic
- Drag-drop reorder → `PATCH /admin/manuals/:manualId/topics/:id` with `{ order_index }`

**Right — Settings panel (sticky):**
- Publish/Unpublish button → `PATCH /admin/manuals/:id/publish`
- Cover image upload → `POST /admin/manuals/:id/cover`
- PDF upload → `POST /admin/manuals/:id/pdf`
- Inline editable metadata (title, subject, level, language, tags, premium) → `PATCH /admin/manuals/:id`
- Danger zone: delete with inline confirm → `DELETE /admin/manuals/:id`

---

## 3. Practical Workbooks

**Routes:** `/dashboard/content/practicals` · `/dashboard/content/practicals/new` · `/dashboard/content/practicals/:id`

### List page
- 4 stat cards: Total / Published / Draft / Premium
- Search filter
- Table: Title + time · Template badge (colour-coded) · Manual · Difficulty · Marks · Publish toggle (inline) · Created · Actions
- Inline publish toggle → `PATCH /admin/practicals/:id/publish`

### Create form (`/new`)
- Template selector: 5 cards (Chemistry AL · Physics AL · Biology · CS · Generic) — selecting auto-scaffolds sections on backend
- Fields: Title · Manual (dropdown from API) · Chapter (dropdown, loads on manual select) · Estimated Time · Difficulty · Premium + Price
- Submit → `POST /admin/practicals` → redirect to editor with scaffolded sections

### Editor (`/:id`) — 4 tabs

**Tab: Sections**
- Left sidebar: draggable section pills (@dnd-kit) with label, type, marks, "student fills" tag
- Reorder → `PATCH /admin/practicals/:id/sections/reorder`
- Add Section modal → `POST /admin/practicals/:id/sections`
- Right panel: Section Header (label, toggles, marks, delete) + type-specific editor (auto-save at 800ms debounce via `useDebouncedSave`)

**13 section type editors:**
| Type | Editor | Saves |
|------|--------|-------|
| `rich_text` | HTML textarea | `{ content: { html } }` |
| `checklist` | Dynamic list of text inputs | `{ content: { items: [] } }` |
| `table` | Column builder + row count + preview | `{ content: { columns, rows } }` |
| `graph` | X/Y axis labels+units, scale, grid, trend note | `{ content: { xAxis, yAxis, gridSize, trendNote } }` |
| `calculation` | Formula (monospace) + description + steps hint | `{ content: { formula, description, stepsHint } }` |
| `equation` | Multiple equation inputs + studentMustWrite toggle | `{ content: { equations, studentMustWrite } }` |
| `image` | Dropzone → `POST /admin/sections/:id/media` + caption | `{ content: { url, caption } }` |
| `drawing` | Instructions + optional reference image upload | `{ content: { instructions, referenceUrl } }` |
| `mcq` | Questions panel: 4 options, radio for correct, marks | `POST /admin/sections/:id/questions` |
| `short_answer` | Questions panel: question + model answer + marks | `POST /admin/sections/:id/questions` |
| `long_answer` | Prompt textarea + min words | `{ content: { prompt, minWords } }` |
| `code` | Language selector + starter code + instructions | `{ content: { language, starterCode, instructions } }` |
| `flowchart` | Instructions + expected node count | `{ content: { instructions, nodeCount } }` |

**Tab: Rubrics**
- Warning if no rubrics (AI grader can't work)
- List of criterion cards with inline edit + delete
- Total marks sum display
- Add criterion form → `POST /admin/practicals/:id/rubrics`

**Tab: Submissions**
- Status filter tabs: Submitted / Graded / In Progress
- Attempt table: Student · Phone · Status · Submitted date · Score
- Click attempt → detail view: Download PDF button + AI grading report (per-criterion breakdown)

**Tab: Settings**
- Metadata edit: title, time, difficulty, premium, price → `PATCH /admin/practicals/:id`
- Publish/Unpublish button
- Danger zone: type-title confirm → `DELETE /admin/practicals/:id`

---

## 4. Past Papers

**Route:** `/dashboard/content/past-questions`

- 4 stat cards: Total Papers / Verified / With Solutions / Total Downloads
- Filters: search · Level pill toggle (All / O-Level / A-Level)
- Table: Exam Title + date · Subject · Level badge · Year · Verified badge · Solution badge · Downloads · Actions (3-dot)
- 3-dot actions: Upload Solution · Verify/Unverify · Delete

### Upload Past Paper modal
- Fields: Exam Title · Subject · Exam Year · Level · Exam PDF (required) · Solution PDF (optional)
- Sends `multipart/form-data` → `POST /admin/past-questions`

### Upload Solution modal (per row)
- Single file picker → `POST /admin/past-questions/:id/solution`

### Verify
- Inline → `PATCH /admin/past-questions/:id/verify` (toggles)

---

## 5. Users

**Route:** `/dashboard/students`

- Role tabs: All Users / Students / Mentors
- Search by name
- Table: Display name + email · Level / School · Role badge · Status badge · Joined · Actions (3-dot)
- 3-dot actions: Activate/Suspend · Change Role · Grant Subscription

### Grant Subscription modal
- Fields: Plan (Basic / Premium) · Duration (days)
- → `POST /admin/users/:id/grant-subscription`

### Activate / Suspend
- Inline → `PATCH /admin/users/:id/activate` with `{ isActive: true|false }`

### Change Role
- Inline select → `PATCH /admin/users/:id/role` with `{ role }`

---

## 6. Mentors

**Route:** `/dashboard/mentors`

Sidebar shows live badge with pending count.

- Status tabs: Pending / Approved / Rejected / Suspended / All
- Search
- Table: Name + phone · Subjects · Status badge · Total Earnings · Pending Payout · Joined · Action buttons
- Action buttons vary by status (see below)

| Status | Buttons shown |
|--------|--------------|
| Pending | Approve (green) · Reject (red, opens reason modal) |
| Approved | Suspend (opens reason modal) · Payout (opens payout modal) |
| Rejected | Approve only |
| Suspended | Reinstate (same as Approve) |

### Reject / Suspend modal — reason textarea required
### Payout modal — Amount (XAF) · Phone · Service (MTN / Orange)

---

## 7. Payments

**Route:** `/dashboard/payments`

- 4 stat cards from `GET /admin/payments/stats`: Total Revenue · Transactions · Success Rate · Monthly Revenue
- Status filter: All / Completed / Pending / Failed
- Date range pickers: Start Date · End Date
- Table: Transaction ID · Amount · Purpose · Gateway · Phone · Status badge · Date
- Paginated

⚠️ **Known issue:** API returns 500 due to FK ambiguity. A warning banner is shown. See BUGS.md.

---

## 8. Discounts

**Route:** `/dashboard/discounts`

- 3 stat cards: Total Codes / Active / Total Uses
- Table: Code (with copy button) · Type · Value · Uses (used/max) · Expires · Active toggle · Created · Delete

### Create Discount Code modal
- Fields: Code (with auto-generate button) · Type (Percentage / Fixed XAF) · Value · Max Uses · Expiry Date · Description
- → `POST /admin/discounts`

### Inline active toggle
- → `PATCH /admin/discounts/:id/toggle`

### Leaderboard Auto-Reward modal
- Fields: Top N students · Discount % · Valid for (days)
- → `POST /admin/discounts/leaderboard-reward`
- Toast shows count of students rewarded

---

## 9. Support / Helpdesk

**Route:** `/dashboard/support`

Sidebar shows live badge with open ticket count.

- Status tabs: Open / In Progress / Resolved / All
- Table: Subject · Student name · Category · Priority badge (colour-coded) · Status badge · Opened date · "View →"
- Click row → Ticket Detail view (replaces page, Back button returns to list)

### Ticket Detail view
- Header: Subject · Student name · Date · Inline priority selector (Low / Medium / High / Urgent) · Status badge
- Original message block
- Reply thread: admin replies (purple bubbles right) / student replies (grey bubbles left)
- Reply box: textarea + Send button → `POST /admin/support/:id/reply`
- Priority change fires immediately → `PATCH /admin/support/:id/priority`

---

## 10. Study Groups

**Route:** `/dashboard/groups`

- 3 stat cards: Total Groups / Total Members / Private Groups
- Table: Group name + description · Subject · Level badge · Members · Type (Public/Private) · Created · Announce button

### Create Group modal
- Fields: Name · Subject · Level · Description
- → `POST /admin/groups`

### Announce modal (per group)
- Textarea for announcement content
- → `POST /admin/groups/:id/announce` with `{ content }` (not `message`)

---

## 11. Notifications

**Route:** `/dashboard/notifications`

Single-screen broadcast form.

- Audience selector cards: All Users / Students Only / Mentors Only
- Title input (100 char limit with counter)
- Body textarea (500 char limit with counter)
- Live preview card (shows how notification looks on mobile)
- Send button → `POST /admin/notifications/broadcast`
- Success banner shows count of users notified

---

## 12. Platform Settings

**Route:** `/dashboard/settings`

9 configurable settings, each with its own Save button (enabled only when value changed).

| Setting key | Label | Unit |
|-------------|-------|------|
| `subscription_basic_price` | Basic Plan Price | XAF/month |
| `subscription_premium_price` | Premium Plan Price | XAF/month |
| `topic_default_price` | Default Topic Price | XAF |
| `mentor_commission_percent` | Mentor Commission | % |
| `ai_limit_free` | AI Limit — Free | questions/month |
| `ai_limit_basic` | AI Limit — Basic | questions/month |
| `ai_limit_premium` | AI Limit — Premium | questions/month (-1 = unlimited) |
| `past_q_free_views` | Free Past Paper Views | per month |
| `discount_leaderboard_top` | Leaderboard Auto-Reward Top N | students |

- AI limit fields have "Unlimited" checkbox (sends `-1`, shows ∞)
- Each field saves independently → `POST /admin/config` with `{ key, value }`
- Info banner: "Changes apply within ~10 minutes (server-side cache TTL)"
- `normalizeConfig()` handles both flat-object and array-of-`{key,value}` API shapes
