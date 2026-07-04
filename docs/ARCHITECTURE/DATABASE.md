# Database Reference

The database is **PostgreSQL** hosted on **Supabase**. The frontend never connects to it directly — all reads and writes go through the Railway API. This document is a reference for understanding data shapes and for backend debugging.

---

## Tables overview

| Table | Purpose |
|-------|---------|
| `users` | All platform users (students, mentors, admins) |
| `manuals` | GCE study guide books |
| `topics` | Chapters/lessons within a manual |
| `practicals` | Lab workbooks (GCE practical exercises) |
| `sections` | Content blocks inside a practical |
| `past_questions` | GCE past examination papers |
| `payments` | Revenue transactions |
| `support_tickets` | Helpdesk messages from students |
| `discounts` | Promo codes and campaigns |
| `study_groups` | Collaborative student groups |
| `mentor_profiles` | Extended data for mentor users |
| `rubrics` | AI grading criteria for practicals |

---

## Table details

### `users`
```sql
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name        TEXT NOT NULL,
  email               TEXT UNIQUE,
  full_name           TEXT,
  phone_number        TEXT,
  role                TEXT NOT NULL DEFAULT 'student', -- 'student' | 'mentor' | 'admin'
  subscription_plan   TEXT NOT NULL DEFAULT 'free',    -- 'free' | 'basic' | 'premium'
  subscription_active BOOLEAN NOT NULL DEFAULT false,
  subscription_end    TIMESTAMPTZ,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  exam_level          TEXT,   -- 'O-Level' | 'A-Level'
  division            TEXT,
  school_name         TEXT,
  ai_questions_asked  INTEGER NOT NULL DEFAULT 0,
  ai_monthly_limit    INTEGER NOT NULL DEFAULT 10,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at       TIMESTAMPTZ
);
```

### `manuals`
```sql
CREATE TABLE manuals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  subject      TEXT NOT NULL,
  level        TEXT NOT NULL,    -- 'O-Level' | 'A-Level' | 'Both'
  language     TEXT NOT NULL DEFAULT 'English', -- 'English' | 'French' | 'Bilingual'
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_premium   BOOLEAN NOT NULL DEFAULT false,
  cover_url    TEXT,
  file_url     TEXT,             -- full PDF download URL
  tags         TEXT[] DEFAULT '{}',
  views        INTEGER NOT NULL DEFAULT 0,
  downloads    INTEGER NOT NULL DEFAULT 0,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `topics`
```sql
CREATE TABLE topics (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id        UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  content          TEXT,           -- HTML or plain text body
  content_type     TEXT NOT NULL DEFAULT 'text', -- 'text' | 'pdf' | 'video' | 'mixed'
  difficulty       TEXT NOT NULL DEFAULT 'beginner', -- 'beginner' | 'intermediate' | 'advanced'
  estimated_time   INTEGER NOT NULL DEFAULT 0,  -- minutes
  price_xaf        INTEGER NOT NULL DEFAULT 0,
  is_premium       BOOLEAN NOT NULL DEFAULT false,
  is_published     BOOLEAN NOT NULL DEFAULT true,
  media_url        TEXT,
  order_index      INTEGER NOT NULL DEFAULT 0,
  views            INTEGER NOT NULL DEFAULT 0,
  completion_count INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `practicals`
```sql
CREATE TABLE practicals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  subject          TEXT,          -- e.g. 'Chemistry', 'Mathematics' (full display name)
  exam_level       TEXT,          -- 'OL'|'AL'|'Probatoire'|'BAC'|'BAC_TECH'|'BTS'|'CAP'|'BEPC'|'CEP'|'Other'
  subject_template TEXT NOT NULL, -- 'chemistry_al'|'physics_al'|'biology'|'computer_science'|'generic'
  manual_id        UUID REFERENCES manuals(id),
  chapter_id       UUID,          -- references a chapter/topic within the manual
  is_published     BOOLEAN NOT NULL DEFAULT false,
  is_premium       BOOLEAN NOT NULL DEFAULT false,
  difficulty       TEXT NOT NULL DEFAULT 'beginner',
  estimated_time   INTEGER NOT NULL DEFAULT 60,
  total_marks      INTEGER NOT NULL DEFAULT 0,  -- denormalized sum of rubric max_marks
  price_xaf        INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration (run if table already exists):
-- ALTER TABLE practicals
--   ADD COLUMN IF NOT EXISTS subject    TEXT,
--   ADD COLUMN IF NOT EXISTS exam_level TEXT;
```

### `sections`
```sql
CREATE TABLE sections (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practical_id         UUID NOT NULL REFERENCES practicals(id) ON DELETE CASCADE,
  label                TEXT NOT NULL,
  type                 TEXT NOT NULL, -- see section types below
  content              JSONB,         -- type-specific content (see SectionEditor.tsx)
  is_student_fillable  BOOLEAN NOT NULL DEFAULT true,
  is_premium           BOOLEAN NOT NULL DEFAULT false,
  max_marks            INTEGER NOT NULL DEFAULT 0,
  order_index          INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Section types: 'rich_text' | 'checklist' | 'table' | 'graph' | 'calculation' |
--                'equation' | 'image' | 'drawing' | 'mcq' | 'short_answer' |
--                'long_answer' | 'code' | 'flowchart'
```

### `past_questions`
```sql
CREATE TABLE past_questions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_title   TEXT NOT NULL,
  exam_year    INTEGER NOT NULL,
  subject      TEXT NOT NULL,
  level        TEXT NOT NULL,    -- 'O-Level' | 'A-Level'
  exam_board   TEXT,
  paper_type   TEXT,
  file_url     TEXT,             -- exam PDF
  solution_url TEXT,             -- solution PDF
  has_solution BOOLEAN NOT NULL DEFAULT false,
  is_premium   BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_verified  BOOLEAN NOT NULL DEFAULT false,
  views        INTEGER NOT NULL DEFAULT 0,
  downloads    INTEGER NOT NULL DEFAULT 0,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `payments`
```sql
CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id    TEXT UNIQUE NOT NULL,
  user_id           UUID NOT NULL REFERENCES users(id),  -- ⚠️ FK name matters (see BUGS.md)
  amount            INTEGER NOT NULL,   -- in XAF
  currency          TEXT NOT NULL DEFAULT 'XAF',
  gateway           TEXT NOT NULL,      -- 'fapshi' | 'mesomb'
  phone_number      TEXT,
  service           TEXT,               -- 'MTN' | 'ORANGE'
  purpose           TEXT NOT NULL,      -- 'subscription'|'topic'|'past_question'|'mentor_session'
  subscription_plan TEXT,
  status            TEXT NOT NULL DEFAULT 'pending', -- 'pending'|'completed'|'failed'|'cancelled'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `support_tickets`
```sql
CREATE TABLE support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  subject     TEXT NOT NULL,
  category    TEXT NOT NULL, -- 'payment'|'content'|'account'|'technical'|'other'
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open', -- 'open'|'in_progress'|'resolved'|'closed'
  priority    TEXT NOT NULL DEFAULT 'medium', -- 'low'|'medium'|'high'|'urgent'
  admin_reply TEXT,
  replied_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `discounts`
```sql
CREATE TABLE discounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT,
  description    TEXT,
  code           TEXT UNIQUE NOT NULL,
  discount_type  TEXT NOT NULL, -- 'percentage' | 'fixed'
  discount_value NUMERIC NOT NULL,
  applies_to     TEXT[] DEFAULT '{}',
  max_uses       INTEGER,       -- null = unlimited
  current_uses   INTEGER NOT NULL DEFAULT 0,
  user_limit     INTEGER NOT NULL DEFAULT 1,
  start_date     TIMESTAMPTZ,
  end_date       TIMESTAMPTZ,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `study_groups`
```sql
CREATE TABLE study_groups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  type         TEXT NOT NULL DEFAULT 'general', -- 'general'|'exam_level'|'division'|'subject'
  exam_level   TEXT,
  division     TEXT,
  subject      TEXT,
  is_private   BOOLEAN NOT NULL DEFAULT false,
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `mentor_profiles`
```sql
CREATE TABLE mentor_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID UNIQUE NOT NULL REFERENCES users(id),
  full_name           TEXT NOT NULL,
  subjects            TEXT[] DEFAULT '{}',
  bio                 TEXT,
  hourly_rate         INTEGER NOT NULL DEFAULT 0,
  verification_status TEXT NOT NULL DEFAULT 'pending', -- 'pending'|'approved'|'rejected'|'suspended'
  total_sessions      INTEGER NOT NULL DEFAULT 0,
  total_earnings      INTEGER NOT NULL DEFAULT 0,
  pending_payout      INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `rubrics`
```sql
CREATE TABLE rubrics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practical_id UUID NOT NULL REFERENCES practicals(id) ON DELETE CASCADE,
  criterion    TEXT NOT NULL,
  description  TEXT,
  max_marks    INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Indexes (recommended)

```sql
-- Performance indexes for common admin queries
CREATE INDEX idx_manuals_level ON manuals(level);
CREATE INDEX idx_manuals_is_published ON manuals(is_published);
CREATE INDEX idx_topics_manual_id ON topics(manual_id);
CREATE INDEX idx_topics_order ON topics(manual_id, order_index);
CREATE INDEX idx_sections_practical_id ON sections(practical_id);
CREATE INDEX idx_sections_order ON sections(practical_id, order_index);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX idx_past_questions_level ON past_questions(level);
CREATE INDEX idx_past_questions_year ON past_questions(exam_year DESC);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_mentor_profiles_status ON mentor_profiles(verification_status);
```

---

## RLS policies (required for admin writes)

The following RLS policies must exist for the admin API to insert/update records. Without them the backend gets a silent permission error.

```sql
-- Allow admin role to manage manuals
CREATE POLICY admin_manage_manuals ON manuals
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Allow admin role to manage past_questions
CREATE POLICY admin_manage_past_questions ON past_questions
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');
```

Or use the Supabase **service role key** in the backend (bypasses RLS entirely — recommended for admin APIs).

---

## Storage buckets (Supabase Storage)

| Bucket | Used for | Access |
|--------|---------|--------|
| `manual-covers` | Cover images uploaded via `POST /admin/manuals/:id/cover` | Public read |
| `manual-pdfs` | Full PDF uploads via `POST /admin/manuals/:id/pdf` | Authenticated read |
| `topic-media` | Topic attachment uploads | Authenticated read |
| `section-media` | Section images/drawings in practicals | Authenticated read |
| `past-papers` | Exam paper PDFs | Authenticated read |
| `past-solutions` | Solution PDFs | Authenticated read |
