# DigiManual — Complete Admin Flow

**Platform:** GCE Cameroon exam-prep (O-Level & A-Level)
**Admin Panel URL:** `/dashboard`
**API Base:** `https://api-production-4804.up.railway.app/api/v1`
**Brand colour:** Purple (`#7c3aed` / `purple-600`)

---

## Table of Contents

1. [Login](#1-login)
2. [Dashboard — Home](#2-dashboard--home)
3. [Study Manuals](#3-study-manuals)
4. [Practical Workbooks](#4-practical-workbooks)
5. [Past Papers](#5-past-papers)
6. [Users](#6-users)
7. [Mentors](#7-mentors)
8. [Payments](#8-payments)
9. [Discounts](#9-discounts)
10. [Support / Helpdesk](#10-support--helpdesk)
11. [Study Groups](#11-study-groups)
12. [Notifications](#12-notifications)
13. [Platform Settings](#13-platform-settings)
14. [Auth & Session Mechanics](#14-auth--session-mechanics)

---

## 1. Login

**URL:** `/login`

### What the admin sees
A centred card with:
- DigiManual logo + "Admin Panel" heading
- **Email** input
- **Password** input
- **Sign In** button

### What happens on submit
1. `POST /auth/login` with `{ email, password }`
2. Response returns `{ accessToken, refreshToken, user }`
3. `accessToken` is stored **in Zustand memory only** (never localStorage — protects against XSS)
4. `refreshToken` is stored in `localStorage`
5. Admin is redirected to `/dashboard`

### Access control
- All dashboard routes are wrapped in `<ProtectedRoute>` (`components/auth/ProtectedRoute.tsx`)
- If no valid access token exists, the user is bounced back to `/login`
- The Axios interceptor in `lib/api/client.ts` attaches `Authorization: Bearer <token>` to every request automatically
- On 401, the interceptor attempts a silent token refresh using the stored `refreshToken` before retrying the original request

---

## 2. Dashboard — Home

**URL:** `/dashboard`

### Purpose
Real-time overview of platform health. The first screen the admin lands on after login.

### What the admin sees

#### Stat cards (6 cards, top row)
| Card | Value source |
|------|-------------|
| Total Users | `GET /admin/dashboard` |
| Active Students | from dashboard data |
| Total Revenue | sum in XAF from dashboard data |
| Active Manuals | published manuals count |
| Mentor Applications | pending mentor count |
| Open Support Tickets | unresolved ticket count |

#### Revenue chart
- Line/area chart from Recharts showing income vs expenses over time
- Data from `GET /admin/payments/stats`

#### Recent Payments table
- Shows last ~5–10 transactions
- Columns: User, Amount (XAF), Plan, Status badge (green success / yellow pending / red failed), Date
- Data from the dashboard endpoint

### What the admin can do here
- Read platform state at a glance
- Click sidebar links to navigate to any section

---

## 3. Study Manuals

**URL:** `/dashboard/content/manuals`

Manuals are GCE study guide books. Each manual contains topics (chapters with lesson content). This is a two-page flow: List → Detail/Editor.

---

### 3.1 Manuals List

#### What the admin sees

**Top bar**
- Page title: "Study Manuals" + subtitle "Manage all GCE study guides"
- **+ Create Manual** button (purple) → opens Create Modal

**4 stat cards**
| Card | Value |
|------|-------|
| 📚 Total Manuals | total count from API |
| ✅ Published | manuals where `is_published = true` |
| 🔒 Premium | manuals where `is_premium = true` |
| 👁 Total Views | sum of `views` across current page |

**Filter bar (all in one row)**
- Search input — searches by title or subject
- Level dropdown: All Levels / O-Level / A-Level / Both
- Language dropdown: All / English / French / Bilingual
- Status pill toggle: All / Published / Draft

**Manuals table**
| Column | Content |
|--------|---------|
| Cover | 48×64px thumbnail, grey placeholder if none |
| Title | Bold title + subject badge (blue pill) below |
| Level | Colour-coded pill: O-Level (blue), A-Level (indigo), Both (grey) |
| Language | EN / FR / BILINGUAL badge |
| Topics | Topic count (shown as "— topics" pending API support) |
| Views | Eye icon + view count |
| Status | Green "Published" pill or yellow "Draft" pill |
| Created | Formatted date |
| Actions | Three-dot ⋮ menu |

**Three-dot action menu per row**
- **Edit Manual** → navigates to `/dashboard/content/manuals/:id`
- **View Topics** → navigates to `/dashboard/content/manuals/:id`
- **Publish / Unpublish** → `PATCH /admin/manuals/:id/publish` (fires inline, no navigation)
- **Delete** → opens Delete Confirm modal

**Row behaviour**
- Clicking anywhere on a row navigates to the manual's detail page
- Publish toggle and action menu clicks stop row-click propagation

**Empty state**
- Book icon + "No manuals yet" + "Create your first manual" link

**Pagination**
- Shown when `pages > 1`
- Shows: total count, current page / total pages
- Prev / Next buttons

---

#### 3.1a Create Manual Modal

Opened by the **+ Create Manual** button. A centred modal, 560px wide.

**Fields**

| Field | Type | Notes |
|-------|------|-------|
| Title | Text input | Required |
| Subject | Text input | Required |
| Level | Pill selector | O-Level (purple), A-Level (indigo), Both (grey) |
| Language | Pill selector | English / French / Bilingual |
| Cover Image | Clickable aspect-video upload box | JPG/PNG, max 5MB |
| Full PDF | File picker | Optional, PDF max 50MB |
| Description | Textarea (3 rows) | Optional |
| Tags | Chip input | Type and press Enter or comma → creates a blue chip; click × to remove |
| Premium Content | Toggle switch | Label: "Require subscription to access" |

**Submission**
- Sends as `multipart/form-data` (because cover + PDF files are included)
- `POST /admin/manuals`
- On success: toast "Manual created", modal closes, list refreshes

---

#### 3.1b Delete Manual Confirm

- Modal with: "Delete '{title}'? This will also delete all topics and questions inside it. This cannot be undone."
- Cancel / Delete (red) buttons
- `DELETE /admin/manuals/:id`

---

### 3.2 Manual Detail / Topic Editor

**URL:** `/dashboard/content/manuals/:id`

**Layout:** Two-column — 65% topics (left) + 35% sticky settings panel (right)

---

#### Breadcrumb (top)
`Manuals > {Manual Title}` + green "Published" badge (if live)

---

#### Left column — Topics management

**Section header**
- `Topics (N)` count in bold
- **+ Add Topic** button (purple) → shows inline form below the header

**+ Add Topic inline form**
Opens as an expandable panel below the header (not a modal). Fields:

| Field | Type | Notes |
|-------|------|-------|
| Title | Text input | Required |
| Description | Text input | Short summary |
| Content Body | Monospace textarea (6 rows, resizable) | The lesson text itself |
| Content Type | Pill selector | Text / PDF / Mixed |
| Difficulty | Pill selector | Beginner / Intermediate / Advanced |
| Estimated Time | Number input | In minutes |
| Order Position | Number input | `order_index` for sorting |
| Premium Topic | Toggle | If on, shows Individual Price field |
| Individual Price | Number input | XAF — shown only when Premium is on |

Actions: Cancel / **Save Topic →**

After saving: `POST /admin/manuals/:manualId/topics`, form closes, topic appears in list.

**Topic cards**
Each saved topic shows as a draggable card:

```
[≡ drag]  Chapter 1 — Quadratic Equations
           PDF  |  ⏱ 15 min  |  Beginner  |  Free
                          [✏ Edit]  [🗑 Delete]
[📎 Upload Media]  ← appears below each card
```

- **Drag handle** (≡) on left — HTML5 drag-and-drop
  - Drag a card up/down to reorder
  - On drop: `PATCH /admin/manuals/:manualId/topics/:id` with new `order_index`
- **Content type icon** + estimated time + difficulty badge + free/premium badge
- **Edit (pencil)** → replaces card with the same inline form, pre-filled
- **Delete (trash)** → `DELETE /admin/manuals/:manualId/topics/:id` (no confirm dialog — immediate)
- **Upload Media** row at bottom of each card → file picker → `POST /admin/manuals/:manualId/topics/:id/media` (multipart/form-data, field: `media`)
  - If media already uploaded: shows "View uploaded media" link

**Empty state (no topics)**
- "No topics yet" + "Add the first topic" link

---

#### Right column — Settings panel (sticky)

Always visible while scrolling through topics on the left.

**1. Publish / Unpublish button (top)**
- If draft → large green **"🚀 Publish Manual"** button → `PATCH /admin/manuals/:id/publish`
- If live → outlined red **"Unpublish"** button → same endpoint

**2. Cover Image card**
- Aspect-video preview box (grey with camera icon if empty)
- Shows uploaded cover image if present
- **Upload Cover Image** button → file picker (image/*) → `POST /admin/manuals/:id/cover` (multipart/form-data, field: `cover`)

**3. Full PDF card**
- Dashed box: shows "View uploaded PDF" link if PDF exists, else "No PDF uploaded"
- **Upload Full PDF** button → file picker (.pdf) → `POST /admin/manuals/:id/pdf` (multipart/form-data, field: `pdf`)
- Helper text: "Optional — students can download the complete manual"

**4. Details (inline editable)**
Inputs pre-filled with current manual data:
- Title (text)
- Subject (text)
- Level (pill selector: O-Level / A-Level / Both)
- Language (pill selector: EN / FR / Bilingual)
- Tags (chip input — existing chips shown, add/remove)
- Premium toggle

**Save Changes** button → `PATCH /admin/manuals/:id`

**5. Danger Zone (bottom)**
- Red-bordered card
- "Delete Manual" button → confirm step:
  - "Are you sure?" text + Cancel / Confirm buttons
  - On confirm: `DELETE /admin/manuals/:id` → redirects to `/dashboard/content/manuals`

---

## 4. Practical Workbooks

**URL:** `/dashboard/content/practicals`

GCE lab workbooks. Students complete them step-by-step; AI grades their responses against admin-defined rubrics. Three-page flow: List → Create → Editor.

---

### 4.1 Practicals List

#### What the admin sees

**Top bar**
- "Practical Workbooks" title + subtitle
- **+ New Practical** button → navigates to `/dashboard/content/practicals/new`

**4 stat cards:** Total / Published / Draft / Premium

**Search bar** — filters by title

**Practicals table**
| Column | Content |
|--------|---------|
| Title | Name + estimated time (grey subtext) |
| Template | Colour-coded badge: Chemistry AL (emerald), Physics AL (blue), Biology (lime), CS (indigo), Generic (grey) |
| Manual | Manual title this practical belongs to |
| Difficulty | Colour pill: Beginner (green), Intermediate (yellow), Advanced (red) |
| Marks | `total_marks` number |
| Published | Inline toggle switch (green = live, grey = draft) — fires `PATCH /admin/practicals/:id/publish` without navigation |
| Created | Formatted date |
| Actions | Three-dot menu: Edit, Delete |

**Row click** → navigates to `/dashboard/content/practicals/:id` (editor)

**Three-dot menu**
- Edit → navigates to editor
- Delete → opens Delete Confirm modal → `DELETE /admin/practicals/:id`

---

### 4.2 Create Practical

**URL:** `/dashboard/content/practicals/new`

**Breadcrumb:** `Practicals > New Practical`

#### Fields

**1. Subject Template (required)** — Clickable card grid (3 columns):

| Card | Template value | Icon | Auto-creates |
|------|---------------|------|-------------|
| Chemistry A-Level | `chemistry_al` | Flask | 14 sections |
| Physics A-Level | `physics_al` | Atom | 14 sections |
| Biology | `biology` | Leaf | 9 sections |
| Computer Science | `computer_science` | Code | 9 sections |
| Generic | `generic` | Document | 4 sections |

Selected card gets a coloured border and tinted background. The backend auto-scaffolds all sections for the chosen template on creation.

**2. Title** — text input, required

**3. Manual** — dropdown loaded from `GET /admin/manuals?limit=100`

**4. Chapter** — dropdown loaded from `GET /admin/manuals/:manualId/chapters` (only enabled after a manual is selected; resets when manual changes)

**5. Estimated Time** — number input (minutes, default 60)

**6. Difficulty** — select: Beginner / Intermediate / Advanced

**7. Premium Content** — toggle switch

**8. Price (XAF)** — number input, only shown when Premium is on

**Submit:** `POST /admin/practicals` → redirects immediately to `/dashboard/content/practicals/:id` (the editor, with all scaffolded sections pre-loaded)

---

### 4.3 Practical Editor

**URL:** `/dashboard/content/practicals/:id`

#### Top bar
- **← Back** button → returns to practicals list
- **Practical title** (truncated if long)
- Status badge: green "● Live" or yellow "Draft"
- **Publish / Unpublish** button (top right)
  - Before publishing: checks if rubrics exist — if none, shows warning toast "Add at least one rubric criterion before publishing"
  - `PATCH /admin/practicals/:id/publish`

#### 4 tabs

---

##### Tab 1: Sections

**Split layout:** Left sidebar (draggable section list) + Right panel (section content editor)

**Left sidebar — Section list**

Each section is a draggable pill showing:
- Drag handle (≡) using `@dnd-kit/sortable`
- Section label (bold when selected, purple tint on selected)
- Section type badge (grey, uppercase)
- "student fills" tag if `is_student_fillable = true`
- Marks badge (e.g. `10m`)

Clicking a section loads its editor in the right panel.

Drag-drop reorder → on drop: `PATCH /admin/practicals/:id/sections/reorder` with `{ order: [{ id, orderIndex }, ...] }`

**+ Add Section** button (dashed border, at bottom of sidebar)
→ Opens a small modal:
- Label input (required)
- Type selector (dropdown of 13 types)
- Cancel / Add Section → `POST /admin/practicals/:id/sections`

---

**Right panel — Section content editor**

Every section has a **Section Header** bar at the top:

| Control | Action |
|---------|--------|
| Label (editable text input) | Auto-saves label after 800ms debounce |
| Student fillable toggle | Auto-saves `isStudentFillable` after 800ms |
| Premium toggle | Auto-saves `isPremium` after 800ms |
| Max marks (number input) | Auto-saves `maxMarks` after 800ms |
| `✓ Saved` indicator | Appears briefly after each auto-save |
| Trash icon | Inline confirm ("Delete section? Yes / No") → `DELETE /admin/sections/:id` |

All saves go to `PATCH /admin/sections/:id`.

Below the header: the **type-specific content editor** (auto-detected from `section.type`):

---

**Section type editors (13 types)**

**`rich_text`** — Rich Text
- Used for: Overview, Aim, Theory, Procedure, Precautions, Algorithm
- Editor: large monospace textarea (10 rows, resizable)
- Saves: `{ content: { html: "..." } }`
- Helper: "Supports HTML: `<p>`, `<strong>`, `<em>`, `<ul>`, `<ol>`, `<h3>`"

---

**`checklist`** — Checklist Builder
- Used for: Apparatus, Reagents
- Editor: numbered list of text inputs, each with a trash button
- **+ Add item** link adds a new blank row
- Saves: `{ content: { items: ["item 1", "item 2", ...] } }`
- Student view: read-only list with checkboxes

---

**`table`** — Table Builder
- Used for: Observation Tables, Measurement Tables, Trace Tables
- Editor:
  1. Numbered column header inputs (each deletable)
  2. **+ Add column** link
  3. "Initial rows" number input (1–50)
  4. Live preview of the empty table (shows up to 5 rows)
- Saves: `{ content: { columns: ["Col 1", "Col 2"], rows: 5 } }`
- Student fills in the cells

---

**`graph`** — Graph Builder
- Used for: Physics AL graph sections
- Editor:
  - X-axis label + unit inputs
  - Y-axis label + unit inputs
  - Scale selector: Linear / Logarithmic
  - Grid size input (cells)
  - Expected trend note (optional text)
- Saves: `{ content: { xAxis: {...}, yAxis: {...}, gridSize, trendNote } }`

---

**`calculation`** — Calculation Builder
- Used for: Calculations in Chemistry and Physics
- Editor:
  - Formula input (monospace font, e.g. `n = CV / 1000`)
  - Description textarea ("what to calculate")
  - Working steps hint (number)
- Saves: `{ content: { formula, description, stepsHint } }`

---

**`equation`** — Chemical/Math Equation Editor
- Used for: Chemical Equations in Chemistry
- Editor:
  - One text input per equation (monospace, e.g. `HCl + NaOH → NaCl + H_2O`)
  - **+ Add equation** link
  - Each equation has a trash button
  - Checkbox: "Student must write the equation themselves"
- Saves: `{ content: { equations: [...], studentMustWrite: true } }`

---

**`image`** — Image / Diagram Upload
- Used for: Biology specimens, Physics diagram uploads
- Editor:
  - Dashed upload zone (click or drop) → `POST /admin/sections/:id/media` (multipart, field: `file`)
  - Shows image preview after upload
  - Caption text input (auto-saved)
- Saves: `{ content: { url: "https://...", caption: "Specimen of Spirogyra" } }`

---

**`drawing`** — Drawing Instructions
- Used for: Biology drawings/labels
- Editor:
  - Instructions textarea (4 rows) — "what to draw"
  - Optional reference image upload (same media endpoint)
  - Uploaded reference shows as a small preview with a remove button
- Saves: `{ content: { instructions: "Draw and label...", referenceUrl: "..." } }`

---

**`mcq`** — Multiple Choice Questions
- Used for: MCQ sections
- Editor is the **Questions Panel**:
  - Lists existing questions (each showing: question text, options A–D, correct answer in green, mark count, delete button)
  - **+ Add Question** link → inline form:
    - Type selector (MCQ / Short Answer)
    - Marks number input
    - Question text textarea
    - 4 option inputs (A/B/C/D), radio to mark correct answer
    - Cancel / Save Question → `POST /admin/sections/:id/questions`

---

**`short_answer`** — Short Answer Questions
- Same Questions Panel as MCQ, but question form shows:
  - Question text textarea
  - Model answer textarea (used by AI grader as reference)
  - Marks input
  - `POST /admin/sections/:id/questions` with `questionType: "short_answer"`

---

**`long_answer`** — Long Answer / Essay
- Used for: Conclusion, Sources of Error, Reflection
- Editor:
  - Prompt / instructions textarea (4 rows)
  - Min words number input
- Saves: `{ content: { prompt: "Write a conclusion...", minWords: 80 } }`

---

**`code`** — Code Editor
- Used for: Computer Science pseudocode, code sections
- Editor:
  - Language selector: Python / Java / Pascal / C / Pseudocode
  - Starter code textarea (monospace, 8 rows, resizable) — pre-loaded for student
  - Instructions textarea (3 rows) — what to implement
- Saves: `{ content: { language, starterCode, instructions } }`

---

**`flowchart`** — Flowchart Builder
- Used for: CS flowchart sections
- Editor:
  - Instructions textarea (4 rows) — what the flowchart should represent
  - Expected node count number input
- Saves: `{ content: { instructions, nodeCount: 8 } }`

---

**Empty state (no section selected)**
- Flask icon + "Select a section from the left to edit its content"
- If no sections exist: "Add your first section" link

---

##### Tab 2: Rubrics

AI grading criteria. The AI uses these when marking student submissions.

**Warning banner** — shown if no rubrics exist:
> "No rubrics defined — AI grader needs at least one criterion to grade submissions."

**Rubric cards (list)**

Each card shows:
- Criterion name (bold)
- Description / marking guidance (sub-text)
- Max marks badge (purple)
- **Edit (pencil)** → replaces card with inline edit form
- **Delete (trash)** → `DELETE /admin/rubrics/:id`

Inline edit form:
- Criterion name input
- Description textarea
- Max marks number input
- Cancel / Save → `PATCH /admin/rubrics/:id`

**Total marks line** (auto-updated):
`Total marks: {sum of all rubric max_marks}` — pulled from `practical.total_marks` (backend keeps this denormalized)

**+ Add Criterion** button (bottom) → opens inline form row:
- Criterion text (e.g. "Accuracy of measurements")
- Description (e.g. "Data recorded to 3 sig. figs., correct units")
- Max marks number
- Cancel / Save → `POST /admin/practicals/:id/rubrics`

---

##### Tab 3: Submissions

Student attempts on this practical.

**Status filter tabs:** Submitted / Graded / In Progress
→ `GET /admin/practicals/:id/attempts?status=submitted|graded|in_progress&limit=20`

**Attempts table**
| Column | Content |
|--------|---------|
| Student | `display_name` |
| Phone | student phone number |
| Status | Colour badge: graded (green), submitted (purple), in_progress (grey) |
| Submitted | Formatted date |
| Score | `total_marks_awarded` |
| Action | "View →" link |

**Attempt detail view** (click "View →")

Shows:
- Student name + phone + submitted date
- **Download PDF** button (links to `pdf_url` — the student's completed workbook as PDF)
- **AI Grading Report card:**
  - Total marks awarded (large purple badge)
  - Summary text (AI-generated, shown in italic)
  - Per-criterion breakdown: each criterion shows marks awarded / max marks + AI comment
- **← Back to list** link

---

##### Tab 4: Settings

**Publish / Unpublish button** (large, top)

**Metadata card** (editable):
- Title
- Estimated Time (min)
- Difficulty (dropdown)
- Premium toggle
- Price in XAF (shown only when Premium is on)
- **Save Settings** → `PATCH /admin/practicals/:id`

**Danger Zone card** (red border):
- "This will permanently delete the practical and all student attempts."
- "Type {title} to confirm:" — text input
- **Delete Practical** button (disabled until input matches title exactly)
- `DELETE /admin/practicals/:id` → redirects to practicals list

---

## 5. Past Papers

**URL:** `/dashboard/content/past-questions`

GCE past examination papers with optional solutions.

### What the admin sees

**Filter bar:**
- Level dropdown: O-Level / A-Level
- Subject search input
- Year input

**Practicals table**
| Column | Content |
|--------|---------|
| Exam Title | Bold title |
| Subject | text |
| Level | OL/AL pill |
| Year | e.g. 2023 |
| Verified | Green "Verified" badge or grey "Unverified" |
| Solution | "Has solution" badge or "No solution" |
| Actions | Upload solution, Toggle verify, Delete |

### Actions

**Upload Past Paper (modal)**
Fields:
| Field | Type | Notes |
|-------|------|-------|
| Exam Title | Text | Required |
| Subject | Text | Required |
| Level | Dropdown | O-Level / A-Level |
| Exam Year | Number | e.g. 2023 |
| PDF File | File picker | **Required** — the exam paper |
| Solution PDF | File picker | Optional (can upload after) |

Submit → `POST /admin/past-questions` as **multipart/form-data**

> ⚠️ The backend requires the PDF file in the initial create request. Do **not** send as JSON.

**Upload solution (per row)**
- File picker trigger → `POST /admin/past-questions/:id/solution` (multipart, field: `file`)
- Also available if no solution yet via the actions menu

**Verify toggle**
- `PATCH /admin/past-questions/:id/verify`
- Marks the paper as reviewed and confirmed correct

**Delete**
- Confirm dialog → `DELETE /admin/past-questions/:id`

---

## 6. Users

**URL:** `/dashboard/students`

View and manage all platform users: students, mentors, and admins.

### What the admin sees

**Role tabs:** All Users / Students / Mentors (pill-tab style)

**Search input** — filters by name

**Users table**
| Column | Content |
|--------|---------|
| Display Name | with email as sub-text |
| Level / School | student's level and school |
| Role | Badge: Student / Mentor / Admin |
| Status | Green "Active" or red "Suspended" badge |
| Joined | Formatted date |
| Actions | Three-dot menu |

**Three-dot menu per user**
- **Activate / Suspend** → `PATCH /admin/users/:id/activate` with `{ isActive: true|false }`
- **Change Role** → `PATCH /admin/users/:id/role` with `{ role: "student"|"mentor"|"admin" }`
- **Grant Subscription** → opens Grant modal

**Grant Subscription modal**
Fields:
- Plan: Basic / Premium (radio or dropdown)
- Duration: number of days

Submit → `POST /admin/users/:id/grant-subscription` with `{ plan, days }`

Useful for giving free access to scholarship students or testing.

### Empty states
Each role tab has its own empty state with icon and message when no users exist for that role.

---

## 7. Mentors

**URL:** `/dashboard/mentors`

Review mentor job applications and manage approved mentors. The sidebar shows a **live badge** with the pending count.

### What the admin sees

**Status tabs:** Pending / Approved / Rejected / Suspended / All

- **Pending** tab → `GET /admin/mentors/pending?page=1&limit=20`
- All other tabs → `GET /admin/mentors?status={tab}&page=1&limit=20`

**Mentors table**
| Column | Content |
|--------|---------|
| Name | Display name |
| Subject | Teaching subject |
| Qualifications | Degree/certification |
| Status | Colour badge |
| Total Earnings | XAF (formatted, `0 XAF` if null) |
| Pending Payout | XAF (formatted, `0 XAF` if null) |
| Actions | Context-sensitive buttons |

**Context-sensitive action buttons (change by tab)**
| Tab | Buttons shown |
|-----|--------------|
| Pending | Approve, Reject |
| Approved | Suspend, Process Payout |
| Rejected | (view only) |
| Suspended | Reinstate |
| All | Shows appropriate button for each row's status |

### Actions

**Approve**
- `POST /admin/mentors/:id/approve`
- No confirmation dialog — fires immediately
- Moves mentor to Approved list

**Reject (with reason)**
- Opens a small modal with a "Reason" textarea
- `POST /admin/mentors/:id/reject` with `{ reason }`

**Suspend (with reason)**
- Opens a modal with a "Reason" textarea
- `POST /admin/mentors/:id/suspend` with `{ reason }`

**Reinstate**
- `POST /admin/mentors/:id/approve` (same endpoint as approve)

**Process Payout**
- Opens a payout modal with:
  - Amount (XAF) — number input
  - Phone number — text input (for mobile money)
  - Service — e.g. MTN, Orange
- `POST /admin/mentors/:id/payout` with `{ amount, phone, service }`

---

## 8. Payments

**URL:** `/dashboard/payments`

Read-only view of all transactions and revenue statistics.

> ⚠️ **Known backend bug:** This page currently returns a 500 error due to a Supabase FK ambiguity. The backend developer needs to fix the query at `admin.controller.js:462` by specifying `.select('*, users!payments_user_id_fkey(*)')`.

### What the admin sees (once the bug is fixed)

**4 stat cards:**
| Card | Value |
|------|-------|
| Total Revenue | Sum of all successful payments in XAF |
| Today's Revenue | Today's transactions in XAF |
| This Month | Month-to-date in XAF |
| Total Transactions | Count of all transactions |

Stats from `GET /admin/payments/stats`

**Filter bar:**
- Start Date picker
- End Date picker
- Status filter: All / Success / Pending / Failed

**Transactions table**
| Column | Content |
|--------|---------|
| User | Student name |
| Amount | In XAF, bold |
| Plan | Basic / Premium / Topic Purchase |
| Method | Payment provider (MTN, Orange, etc.) |
| Status | Green success / yellow pending / red failed badge |
| Date | Formatted datetime |

Paginated with Prev / Next buttons.

`GET /admin/payments?page=&startDate=&endDate=&status=`

---

## 9. Discounts

**URL:** `/dashboard/discounts`

Create promotional discount codes and auto-reward top students.

### What the admin sees

**Discounts table**
| Column | Content |
|--------|---------|
| Code | The discount code string |
| Type | "Percentage" or "Fixed XAF" |
| Value | e.g. "20%" or "500 XAF" |
| Used | `usageCount / maxUses` |
| Expires | Formatted date or "Never" |
| Status | Toggle pill (green = active, grey = inactive) |
| Actions | Delete button |

### Actions

**Create Discount Code (modal)**

Fields:
| Field | Type | Notes |
|-------|------|-------|
| Code | Text | Or auto-generate button |
| Type | Select | Percentage / Fixed XAF |
| Value | Number | e.g. 20 for 20% or 500 for 500 XAF |
| Max Uses | Number | How many students can use it (0 = unlimited) |
| Expiry Date | Date picker | Leave blank for no expiry |
| Description | Text | Internal note |

Submit → `POST /admin/discounts`

**Toggle active/inactive (inline)**
- Click the status toggle on any row
- `PATCH /admin/discounts/:id/toggle`
- Deactivated codes can't be applied by students

**Delete code**
- `DELETE /admin/discounts/:id`

**Auto-reward Leaderboard Toppers**
A separate form / modal:
- Top N students: number input (e.g. top 5)
- Discount value: percentage input
- Expiry: days from now

`POST /admin/discounts/leaderboard-reward` with `{ topN, discountPercent, expiryDays }`
Response: `{ rewarded: 5 }` — count of students who received a code
Toast: "5 students rewarded"

---

## 10. Support / Helpdesk

**URL:** `/dashboard/support`

Manage helpdesk tickets submitted by students. The sidebar shows a **live badge** with the count of open tickets.

### What the admin sees

**Status filter tabs:** Open / In Progress / Resolved / All

**Tickets table**
| Column | Content |
|--------|---------|
| Subject | Ticket title |
| Student | Student name |
| Priority | Colour badge: urgent (red), high (orange), medium (yellow), low (grey) |
| Status | Open / In Progress / Resolved |
| Opened | Formatted date |
| Replies | Reply count |

**Click a ticket row** → opens the full Ticket Detail view

### Ticket detail view

Shows the full conversation thread:
- Original student message (with timestamp)
- Each reply (student replies in grey, admin replies in purple)
- Timestamps on each message

**Reply box (bottom)**
- Textarea for reply message
- **Send Reply** button → `POST /admin/support/:id/reply` with `{ message }`

**Priority selector**
- Dropdown or button group: Low / Medium / High / Urgent
- Fires immediately: `PATCH /admin/support/:id/priority` with `{ priority }`

Changing priority helps the admin triage a queue of many tickets.

---

## 11. Study Groups

**URL:** `/dashboard/groups`

View and manage student study groups on the platform.

### What the admin sees

**Groups list / table**
| Column | Content |
|--------|---------|
| Group Name | Bold |
| Subject | Subject area |
| Members | Member count |
| Created By | Creator's name |
| Created | Date |
| Actions | Announce, (delete) |

### Actions

**Create Group (modal)**

Fields:
| Field | Type |
|-------|------|
| Group Name | Text |
| Subject | Text |
| Description | Textarea |
| Level | Dropdown (O-Level / A-Level / Both) |

Submit → `POST /admin/groups` with `{ name, subject, description, level }`

**Send Announcement (per group)**
- Button on each group row / card → opens a modal
- Single textarea for the announcement message
- Submit → `POST /admin/groups/:id/announce` with `{ content: message }`

> ⚠️ The field must be named `content`, **not** `message`. The API rejects requests with `{ message }`.

All members of the group receive the announcement as a notification.

---

## 12. Notifications

**URL:** `/dashboard/notifications`

Broadcast push notifications to platform users.

### What the admin sees

A single broadcast form (no list of past notifications):

**Fields:**
| Field | Notes |
|-------|-------|
| Title | Short notification headline |
| Body | The notification text |
| Target Audience | All Users / Students Only / Mentors Only / etc. |

**Send Broadcast** button → `POST /admin/notifications/broadcast` with `{ title, body, audience }`

Response: `{ sent: 120 }` — number of devices/users notified
Toast shows: "Broadcast sent to 120 users"

Use cases:
- Announcing new manuals or practicals
- Exam reminders
- Maintenance warnings
- Leaderboard results

---

## 13. Platform Settings

**URL:** `/dashboard/settings`

Configure platform-wide pricing, AI usage limits, and reward settings. Changes apply within **~10 minutes** (server-side cache TTL).

### What the admin sees

Blue info banner: "Changes apply within 10 minutes (server-side cache TTL)."

**Config loaded from:** `GET /admin/config`
The API may return either a flat `{ key: value }` object **or** an array of `[{ key, value }]` pairs — the frontend handles both via `normalizeConfig()`.

### 9 configurable settings

Each setting has its own **Save** button (only enabled when the value has changed from what's loaded):

| Setting | Label | Unit | Notes |
|---------|-------|------|-------|
| `subscription_basic_price` | Basic Plan Price | XAF/month | Monthly price for Basic plan |
| `subscription_premium_price` | Premium Plan Price | XAF/month | Monthly price for Premium plan |
| `topic_default_price` | Default Topic Price | XAF | Per-topic individual purchase price |
| `mentor_commission_percent` | Mentor Commission | % | Platform cut from each mentor session |
| `ai_limit_free` | AI Limit — Free | questions/month | Free-plan AI question quota |
| `ai_limit_basic` | AI Limit — Basic | questions/month | Basic-plan AI question quota |
| `ai_limit_premium` | AI Limit — Premium | questions/month | Set to `-1` for unlimited → shows ∞ |
| `past_q_free_views` | Free Past Question Views | per month | How many past papers free users can open |
| `discount_leaderboard_top` | Leaderboard Auto-Reward Top N | students | Number of students who earn auto-discounts |

**AI limit fields have an extra "Unlimited" checkbox:**
- When checked: the value is sent as `-1` and the number input shows `∞`
- When unchecked: the number input is editable again

**Save flow (per field):**
- Admin edits value → Save button becomes enabled
- Click Save → `POST /admin/config` with `{ key: "subscription_basic_price", value: "2500" }`
- Toast: "{Label} saved"
- Save button returns to disabled state

**Error handling:**
- If `GET /admin/config` fails, a red error banner is shown with the error message
- Individual field saves show toast errors on failure without blocking other fields

---

## 14. Auth & Session Mechanics

### Token storage
| Token | Where stored | Why |
|-------|-------------|-----|
| `accessToken` | Zustand in-memory state | Never touches localStorage — prevents XSS theft |
| `refreshToken` | `localStorage` | Survives page refresh |

### Axios interceptor (`lib/api/client.ts`)
Every API request automatically:
1. Reads `accessToken` from Zustand store
2. Attaches `Authorization: Bearer <token>` header
3. On **401 response**: tries `POST /auth/refresh` with `{ refreshToken }`
4. If refresh succeeds: retries original request with new token
5. If refresh fails: clears auth state and redirects to `/login`

### Protected routes
All `/dashboard/**` routes are wrapped in `<ProtectedRoute>`:
- Checks for valid `accessToken` in Zustand
- If missing → redirect to `/login`
- Renders children only when authenticated

### Logout
- Clears `accessToken` from Zustand
- Clears `refreshToken` from `localStorage`
- Redirects to `/login`

---

## Appendix A — Sidebar Navigation

```
Dashboard                   /dashboard

▸ Content
  Manuals                   /dashboard/content/manuals
  Practicals                /dashboard/content/practicals
  Past Papers               /dashboard/content/past-questions

▸ People
  Users                     /dashboard/students
  Mentors                   /dashboard/mentors    [badge: pending count]

▸ Revenue
  Payments                  /dashboard/payments

▸ Engagement
  Discounts                 /dashboard/discounts
  Support                   /dashboard/support    [badge: open ticket count]
  Study Groups              /dashboard/groups

▸ Platform
  Notifications             /dashboard/notifications
  Settings                  /dashboard/settings
```

Badges on **Mentors** and **Support** update in real time from the dashboard query.

---

## Appendix B — API Call Summary

| Feature | Method | Endpoint |
|---------|--------|---------|
| Login | POST | `/auth/login` |
| Refresh token | POST | `/auth/refresh` |
| Dashboard stats | GET | `/admin/dashboard` |
| Payment stats | GET | `/admin/payments/stats` |
| List manuals | GET | `/admin/manuals` |
| Create manual | POST | `/admin/manuals` |
| Get manual | GET | `/admin/manuals/:id` |
| Update manual | PATCH | `/admin/manuals/:id` |
| Publish manual | PATCH | `/admin/manuals/:id/publish` |
| Delete manual | DELETE | `/admin/manuals/:id` |
| Upload cover | POST | `/admin/manuals/:id/cover` |
| Upload manual PDF | POST | `/admin/manuals/:id/pdf` |
| List topics | GET | `/admin/manuals/:id/topics` |
| Create topic | POST | `/admin/manuals/:id/topics` |
| Update topic | PATCH | `/admin/manuals/:manualId/topics/:id` |
| Delete topic | DELETE | `/admin/manuals/:manualId/topics/:id` |
| Upload topic media | POST | `/admin/manuals/:manualId/topics/:id/media` |
| List practicals | GET | `/admin/practicals` |
| Create practical | POST | `/admin/practicals` |
| Get practical | GET | `/admin/practicals/:id` |
| Update practical | PATCH | `/admin/practicals/:id` |
| Publish practical | PATCH | `/admin/practicals/:id/publish` |
| Delete practical | DELETE | `/admin/practicals/:id` |
| Add section | POST | `/admin/practicals/:id/sections` |
| Update section | PATCH | `/admin/sections/:id` |
| Reorder sections | PATCH | `/admin/practicals/:id/sections/reorder` |
| Delete section | DELETE | `/admin/sections/:id` |
| Upload section media | POST | `/admin/sections/:id/media` |
| Add question | POST | `/admin/sections/:id/questions` |
| Delete question | DELETE | `/admin/questions/:id` |
| Add rubric | POST | `/admin/practicals/:id/rubrics` |
| Update rubric | PATCH | `/admin/rubrics/:id` |
| Delete rubric | DELETE | `/admin/rubrics/:id` |
| List attempts | GET | `/admin/practicals/:id/attempts` |
| List past papers | GET | `/admin/past-questions` |
| Create past paper | POST | `/admin/past-questions` |
| Upload solution | POST | `/admin/past-questions/:id/solution` |
| Verify paper | PATCH | `/admin/past-questions/:id/verify` |
| Delete paper | DELETE | `/admin/past-questions/:id` |
| List users | GET | `/admin/users` |
| Activate/suspend user | PATCH | `/admin/users/:id/activate` |
| Change user role | PATCH | `/admin/users/:id/role` |
| Grant subscription | POST | `/admin/users/:id/grant-subscription` |
| List pending mentors | GET | `/admin/mentors/pending` |
| List mentors | GET | `/admin/mentors` |
| Approve mentor | POST | `/admin/mentors/:id/approve` |
| Reject mentor | POST | `/admin/mentors/:id/reject` |
| Suspend mentor | POST | `/admin/mentors/:id/suspend` |
| Payout mentor | POST | `/admin/mentors/:id/payout` |
| List payments | GET | `/admin/payments` |
| List discounts | GET | `/admin/discounts` |
| Create discount | POST | `/admin/discounts` |
| Toggle discount | PATCH | `/admin/discounts/:id/toggle` |
| Delete discount | DELETE | `/admin/discounts/:id` |
| Leaderboard reward | POST | `/admin/discounts/leaderboard-reward` |
| List support tickets | GET | `/admin/support` |
| Reply to ticket | POST | `/admin/support/:id/reply` |
| Set ticket priority | PATCH | `/admin/support/:id/priority` |
| List groups | GET | `/admin/groups` |
| Create group | POST | `/admin/groups` |
| Announce to group | POST | `/admin/groups/:id/announce` |
| Broadcast notification | POST | `/admin/notifications/broadcast` |
| Get platform config | GET | `/admin/config` |
| Save config value | POST | `/admin/config` |

---

## Appendix C — Known Backend Bugs

| Bug | Affected feature | Fix needed |
|-----|-----------------|-----------|
| Supabase FK ambiguity on `payments ↔ users` | Payments page (500 error) | Use `.select('*, users!payments_user_id_fkey(*)')` in `admin.controller.js:462` |
| RLS policy blocks admin inserts on `manuals` table | Create Manual | Use Supabase service role client for admin writes, or add RLS policy for `role = 'admin'` |
| RLS policy blocks admin inserts on `past_questions` table | Create Past Paper | Same fix as manuals |
