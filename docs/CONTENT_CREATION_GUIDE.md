# Admin Panel — Content Creation Guide

For the admin panel dev. This walks through exactly how to create manuals, topics,
practicals, and past papers so the content actually shows up correctly in the mobile app
— cross-checked directly against the app's screens (Learn tab, manual detail, topic
detail, Practice tab, practicals flow) and the real backend controller code, not guessed.

Full endpoint reference: `ENDPOINTS_VERIFIED.md`. This doc is about *order of operations*
and *which field controls what on screen* — read both together.

---

## Creating a Manual (→ Learn tab, manual detail, topic detail)

**Order matters — nothing is visible to students until the last step.**

1. **`POST /admin/manuals`** — `{ title, subject, level, description?, language?, tags?, isPremium? }`. Created as a draft (`is_published: false`), invisible no matter what else happens until step 7.
2. **`POST /admin/manuals/:manualId/cover`** — multipart field `cover`. This is the image shown on the Learn tab card *and* the manual detail header.
3. **`POST /admin/manuals/:manualId/file`** — ⚠️ **skip this.** Verified directly against `manual/[manualId].tsx` — it never reads `file_url` anywhere in the current app. This endpoint exists but nothing displays whatever gets uploaded here. Don't spend time uploading a "whole manual PDF" expecting students to see it.
4. **`POST /admin/manuals/:manualId/topics`** per topic — `{ title, contentType, description?, content?, difficulty?, estimatedTime?, priceXaf?, isPremium?, orderIndex? }`. This populates the topic list on the manual detail screen.
   - `contentType: 'text'` → topic screen renders `content` as text.
   - `contentType: 'pdf'` → also needs step 5 to attach the actual file; `content` can stay empty.
   - `isPremium: true` → lock icon in the topic list + paywall on tap.
   - `orderIndex` → controls display order.
5. **`POST /admin/topics/:topicId/media`** — multipart field `media`, only for PDF/image topics. Sets `media_url` — this is what the "PDF viewer button" on the topic screen actually opens (a signed Cloudinary URL, 1hr expiry).
6. **`POST /admin/topics/:topicId/questions`** per question — `{ questionText, questionType, options?, correctAnswer?, marks?, explanation? }`. Powers the "Practice Quiz" button on the topic screen, and feeds `/questions/random` for the Practice tab's subject quizzes.
7. **`PATCH /admin/manuals/:manualId/publish`** — flips `is_published`. Nothing before this is visible to any student.
8. **Publish each topic too** — `createTopic` defaults every topic to `is_published: false`, and there's no dedicated topic-publish endpoint. Do it via `PATCH /admin/topics/:topicId` with `{ is_published: true }`. A published manual with unpublished topics shows up in Learn with an empty/partial topic list — easy to miss.

**Star rating (`average_rating`/`total_ratings`) is never set by an admin.** It's computed automatically from real student ratings. There's no field for it on create or update — don't build one.

### ⚠️ Real inconsistency to know about: create vs. update use different field casing

Verified directly in the controller code, not a doc error:

- **Creating** a manual/topic — body keys are **camelCase**: `isPremium`, `contentType`, `estimatedTime`, `priceXaf`, `orderIndex`.
- **Updating** the same manual/topic — body keys must be **snake_case**: `is_premium`, `content_type`, `estimated_time`, `price_xaf`, `order_index`, plus `cover_url`/`file_url`/`media_url` for any update that bypasses the dedicated upload routes.

If the admin panel's edit form reuses the same field names as its create form, every edit save will **silently no-op** — the backend just ignores keys it doesn't recognize, no error is returned. Build the edit form's payload with snake_case keys, separate from the create form's camelCase payload.

---

## Creating a Practical (→ Practice tab → Practicals)

1. *(Optional)* **`POST /admin/manuals/:manualId/chapters`** — `{ title, description?, orderIndex? }`. Chapters only group **practicals**, never topics — topics are just a flat ordered list under a manual regardless of chapters.
2. **`GET /admin/practicals/templates`** — see what `subjectTemplate` values exist and exactly what sections each one generates, before creating anything.
3. **`POST /admin/practicals`** — `{ manualId, title, subjectTemplate, chapterId?, estimatedTime?, difficulty?, isPremium?, priceXaf? }`. `subjectTemplate` must be one of:

   | Template | Auto-generated sections |
   |---|---|
   | `chemistry_al` | Overview, Aim, Theory, Apparatus, Reagents, Procedure, Observation Tables*, Qualitative Analysis*, Calculations*, Chemical Equations*, Precautions, Sources of Error*, Viva Questions*, Conclusion* |
   | `physics_al` | Overview, Aim, Theory, Apparatus, Diagram Upload*, Procedure, Measurement Tables*, Graph*, Calculations*, Observations*, Errors*, Precautions, Questions*, Conclusion* |
   | `biology` | Theory, Specimens, Apparatus, Procedure, Observation*, Drawing*, Labels*, Questions*, Conclusion* |
   | `computer_science` | Problem Statement, Theory, Algorithm*, Flowchart*, Pseudocode*, Code*, Trace Table*, Test Cases*, Reflection* |
   | `generic` | Overview, Content, Questions*, Conclusion* |

   (`*` = student-fillable section, already assigned marks; everything else is admin-authored reference content the student only reads.) This one call scaffolds the entire section list — no need to build sections one by one for these subjects.
4. Fill in the admin-authored reference content per section via **`PATCH /admin/sections/:id`** (`content` field — shape depends on `type`: rich text, checklist items, table columns, etc.)
5. For sections needing actual sub-questions (mcq/short_answer/long_answer within a section, not a whole-section fill-in), **`POST /admin/sections/:sectionId/questions`**.
6. **`POST /admin/practicals/:id/rubrics`** — `{ criterion, maxMarks, description? }` per grading criterion. This is what AI grading actually grades against — no rubrics means no AI feedback gets generated when a student submits, and the results screen (which polls every 5s and shows per-section feedback) will have nothing to show.
7. **`PATCH /admin/practicals/:id/publish`** — same as manuals, invisible until this flips.

Need a subject outside the 4 built-in templates? Use `generic` and add custom sections via `POST /admin/practicals/:id/sections` on top of it.

---

## Past Papers (→ Practice tab → Past Papers)

1. **`POST /admin/past-questions`** with the PDF as multipart field `file` — `{ examTitle, examYear, subject, level }` required.
2. **`PATCH /admin/past-questions/:id/verify`** — sets **both** `is_verified` and `is_published` to `true` in one call. `GET /questions/past` (what the Past Papers screen calls) filters on **both** flags — creating a paper alone leaves it completely invisible until this step runs.

---

## Quick checklist for "why isn't my content showing up"

- Manual not appearing in Learn tab → is it published? (step 7 above)
- Manual shows but topic list is empty/partial → are the individual topics published? (step 8, easy to miss)
- Topic shows but no PDF/image loads → was media actually uploaded via the dedicated upload endpoint, not just a `content` field?
- Edited a manual/topic and nothing changed → check you're sending snake_case keys on the update call, not the camelCase keys from create
- Practical not appearing → is it published?
- Practical has no AI feedback after a student submits → does it have rubrics?
- Past paper not appearing → was it verified (not just created)?
