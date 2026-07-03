# API Reference

**Base URL:** `https://api-production-4804.up.railway.app/api/v1`

All requests require `Authorization: Bearer <accessToken>` except `/auth/login` and `/auth/refresh`.

All responses follow the envelope:
```json
{
  "success": true,
  "message": "string",
  "data": { ... },
  "timestamp": "ISO 8601"
}
```

---

## Auth

### POST /auth/login
```json
// Request
{ "email": "admin@example.com", "password": "string" }

// Response data
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { "id": "uuid", "displayName": "string", "email": "string", "role": "admin" }
}
```

### POST /auth/refresh
```json
// Request
{ "refreshToken": "eyJ..." }

// Response data
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

### POST /auth/logout
```json
// Request — Bearer token required
// Response data: null
```

---

## Dashboard

### GET /admin/dashboard
```json
// Response data
{
  "stats": {
    "totalStudents": 0,
    "totalMentors": 0,
    "totalManuals": 0,
    "totalQuestions": 0,
    "pendingMentors": 0,
    "activeSubscriptions": 0,
    "revenue30Days": 0
  },
  "recentPayments": [ Payment ],
  "recentUsers": [ UserProfile ]
}
```

---

## Manuals

### GET /admin/manuals
Query params: `page`, `limit`, `search`, `level`, `language`, `published`
```json
// Response data
{
  "manuals": [ Manual ],
  "pagination": { "page": 1, "limit": 20, "total": 0, "pages": 0 }
}
```

### POST /admin/manuals
`Content-Type: multipart/form-data`
```
title          string  required
subject        string  required
level          string  required  "O-Level" | "A-Level" | "Both"
language       string  required  "English" | "French" | "Bilingual"
description    string  optional
tags           string  optional  JSON array string e.g. '["tag1","tag2"]'
is_premium     boolean optional
cover          File    optional  image/*
pdf            File    optional  .pdf
```

### GET /admin/manuals/:id
```json
// Response data: Manual
```

### PATCH /admin/manuals/:id
```json
// Request (any subset of manual fields)
{ "title": "string", "is_premium": true, "tags": ["tag1"] }
```

### PATCH /admin/manuals/:id/publish
```json
// No request body — toggles is_published
```

### DELETE /admin/manuals/:id
```json
// No request body
```

### POST /admin/manuals/:id/cover
`Content-Type: multipart/form-data`  field: `cover` (image)

### POST /admin/manuals/:id/pdf
`Content-Type: multipart/form-data`  field: `pdf` (.pdf)

---

## Topics

### GET /admin/manuals/:manualId/topics
```json
// Response data
{ "topics": [ Topic ] }
```

### POST /admin/manuals/:manualId/topics
```json
{
  "title": "string",
  "description": "string",
  "content": "string",
  "content_type": "text | pdf | video | mixed",
  "difficulty": "beginner | intermediate | advanced",
  "estimated_time": 30,
  "order_index": 0,
  "is_premium": false,
  "price_xaf": 0
}
```

### PATCH /admin/manuals/:manualId/topics/:id
```json
// Same fields as POST, any subset
// Also used for reorder: { "order_index": 2 }
```

### DELETE /admin/manuals/:manualId/topics/:id

### POST /admin/manuals/:manualId/topics/:id/media
`Content-Type: multipart/form-data`  field: `media`

---

## Practicals

### GET /admin/practicals
Query params: `page`, `limit`, `search`
```json
// Response data
{
  "practicals": [ Practical ],
  "pagination": { ... }
}
```

### POST /admin/practicals
```json
{
  "title": "string",
  "subject_template": "chemistry_al | physics_al | biology | computer_science | generic",
  "manual_id": "uuid",
  "chapter_id": "uuid | null",
  "difficulty": "beginner | intermediate | advanced",
  "estimated_time": 60,
  "is_premium": false,
  "price_xaf": 0
}
// Response: created practical with id — frontend navigates to /dashboard/content/practicals/:id
```

### GET /admin/practicals/:id
```json
// Response data: Practical (with sections, rubrics counts)
```

### PATCH /admin/practicals/:id
```json
{ "title": "string", "estimated_time": 90, "difficulty": "advanced", "is_premium": true, "price_xaf": 500 }
```

### PATCH /admin/practicals/:id/publish
No body — toggles `is_published`

### DELETE /admin/practicals/:id

---

## Sections

### GET /admin/practicals/:id/sections
```json
// Response data: { "sections": [ Section ] }
```

### POST /admin/practicals/:id/sections
```json
{ "label": "string", "type": "rich_text | checklist | table | ..." }
```

### PATCH /admin/sections/:id
```json
{
  "label": "string",
  "is_student_fillable": true,
  "is_premium": false,
  "max_marks": 10,
  "content": { }   // type-specific JSON
}
```

### PATCH /admin/practicals/:id/sections/reorder
```json
{ "order": [ { "id": "uuid", "orderIndex": 0 }, { "id": "uuid", "orderIndex": 1 } ] }
```

### DELETE /admin/sections/:id

### POST /admin/sections/:id/media
`Content-Type: multipart/form-data`  field: `file`
```json
// Response data: { "url": "https://..." }
```

---

## Section Questions

### POST /admin/sections/:id/questions
```json
// MCQ
{
  "questionType": "mcq",
  "questionText": "string",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "A",
  "marks": 2
}

// Short answer
{
  "questionType": "short_answer",
  "questionText": "string",
  "modelAnswer": "string",
  "marks": 5
}
```

### DELETE /admin/questions/:id

---

## Rubrics

### GET /admin/practicals/:id/rubrics
```json
// Response data: { "rubrics": [ Rubric ] }
```

### POST /admin/practicals/:id/rubrics
```json
{ "criterion": "string", "description": "string", "max_marks": 10 }
```

### PATCH /admin/rubrics/:id
```json
{ "criterion": "string", "description": "string", "max_marks": 10 }
```

### DELETE /admin/rubrics/:id

---

## Attempts (Submissions)

### GET /admin/practicals/:id/attempts
Query params: `status` (`submitted | graded | in_progress`), `page`, `limit`
```json
// Response data
{
  "attempts": [
    {
      "id": "uuid",
      "student": { "display_name": "string", "phone_number": "string" },
      "status": "graded",
      "submitted_at": "ISO",
      "total_marks_awarded": 45,
      "pdf_url": "https://..."
    }
  ],
  "pagination": { ... }
}
```

### GET /admin/attempts/:id
```json
// Response data: full attempt with AI grading
{
  "attempt": { ... },
  "grading": {
    "total_marks_awarded": 45,
    "summary": "Student demonstrated...",
    "per_criterion": [
      { "criterion": "string", "marks_awarded": 8, "max_marks": 10, "comment": "string" }
    ]
  }
}
```

---

## Past Papers

### GET /admin/past-questions
Query params: `page`, `limit`, `search`, `level`
```json
// Response data
{
  "pastQuestions": [ PastQuestion ],
  "pagination": { ... }
}
```

### POST /admin/past-questions
`Content-Type: multipart/form-data`
```
exam_title   string  required
subject      string  required
level        string  required
exam_year    number  required
file         File    required  .pdf — the exam paper
solution     File    optional  .pdf — the solution
```

### PATCH /admin/past-questions/:id/verify
No body — toggles `is_verified`

### POST /admin/past-questions/:id/solution
`Content-Type: multipart/form-data`  field: `file` (.pdf)

### DELETE /admin/past-questions/:id

---

## Users

### GET /admin/users
Query params: `page`, `limit`, `search`, `role`
```json
// Response data
{
  "users": [ UserProfile ],
  "pagination": { ... }
}
```

### PATCH /admin/users/:id/activate
```json
{ "isActive": true }   // or false to suspend
```

### PATCH /admin/users/:id/role
```json
{ "role": "student | mentor | admin" }
```

### POST /admin/users/:id/grant-subscription
```json
{ "plan": "basic | premium", "days": 30 }
```

---

## Mentors

### GET /admin/mentors/pending
Query params: `page`, `limit`
```json
// Response data: { "mentors": [ MentorProfile ], "pagination": { ... } }
```

### GET /admin/mentors
Query params: `status` (`pending | approved | rejected | suspended | all`), `page`, `limit`, `search`

### POST /admin/mentors/:id/approve
No body

### POST /admin/mentors/:id/reject
```json
{ "reason": "string" }
```

### POST /admin/mentors/:id/suspend
```json
{ "reason": "string" }
```

### POST /admin/mentors/:id/payout
```json
{ "amount": 50000, "phone": "677123456", "service": "MTN | Orange" }
```

---

## Payments

### GET /admin/payments/stats
```json
// Response data: PaymentStats
{
  "totalRevenue": 0,
  "totalTransactions": 0,
  "successRate": 0.0,
  "revenueByPlan": { "basic": 0, "premium": 0, "topic": 0 },
  "revenueByGateway": { "fapshi": 0, "mesomb": 0 },
  "revenueByMonth": [ { "month": "2026-01", "revenue": 0 } ]
}
```

### GET /admin/payments
Query params: `page`, `limit`, `status`, `startDate`, `endDate`
```json
// Response data
{
  "payments": [ Payment ],
  "pagination": { ... }
}
```
⚠️ **Known bug:** returns 500 due to FK ambiguity. See [OPERATIONS/BUGS.md](../OPERATIONS/BUGS.md).

---

## Discounts

### GET /admin/discounts
```json
// Response data: { "discounts": [ DiscountCampaign ] }
```

### POST /admin/discounts
```json
{
  "code": "DIGI2026",
  "discount_type": "percentage | fixed",
  "discount_value": 20,
  "max_uses": 100,
  "description": "string",
  "end_date": "2026-12-31"
}
```

### PATCH /admin/discounts/:id/toggle
No body — flips `is_active`

### DELETE /admin/discounts/:id

### POST /admin/discounts/leaderboard-reward
```json
{ "topN": 5, "discountPercent": 20, "expiryDays": 30 }
// Response data: { "rewarded": 5 }
```

---

## Support

### GET /admin/support
Query params: `status` (`open | in_progress | resolved | closed`), `limit`
```json
// Response data: { "tickets": [ SupportTicket ] }
```

### GET /admin/support/:id
```json
// Response data
{
  "ticket": SupportTicket,
  "replies": [ { "id": "uuid", "message": "string", "sender": "user | admin", "created_at": "ISO" } ]
}
```

### POST /admin/support/:id/reply
```json
{ "message": "string" }
```

### PATCH /admin/support/:id/priority
```json
{ "priority": "low | medium | high | urgent" }
```

---

## Study Groups

### GET /admin/groups
```json
// Response data: { "groups": [ StudyGroup ] }
```

### POST /admin/groups
```json
{ "name": "string", "subject": "string", "description": "string", "level": "O-Level | A-Level | Both" }
```

### POST /admin/groups/:id/announce
```json
{ "content": "string" }   // ⚠️ Must be "content" not "message"
```

---

## Notifications

### POST /admin/notifications/broadcast
```json
// Request
{ "title": "string", "body": "string", "audience": "all | students | mentors" }

// Response data
{ "sent": 120 }
```

---

## Platform Config

### GET /admin/config
```json
// Response data — may be flat object OR array of { key, value } pairs
{
  "subscription_basic_price": "2000",
  "subscription_premium_price": "5000",
  "topic_default_price": "500",
  "mentor_commission_percent": "20",
  "ai_limit_free": "10",
  "ai_limit_basic": "50",
  "ai_limit_premium": "-1",
  "past_q_free_views": "3",
  "discount_leaderboard_top": "5"
}
```
The frontend `normalizeConfig()` function handles both array and object shapes.

### POST /admin/config
```json
// Save one key at a time
{ "key": "subscription_basic_price", "value": "2500" }
```
