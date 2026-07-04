# Bug Tracker

---

## Fixed bugs

### BUG-000 — Vercel deploy fails: recharts peer dependency conflict with React 19
**Severity:** Critical (blocks all deployments)  
**Status:** ✅ Fixed  
**Symptom:** `npm install` on Vercel errors with `ERESOLVE` — `recharts@2.12.7` declares `peer react@"^16.0.0 || ^17.0.0 || ^18.0.0"` but the project uses React 19.2.0.  
**Root cause:** recharts 2.x peer dep declaration hasn't been updated for React 19 yet, even though the library works fine at runtime with React 19.  
**Fix:** Added `.npmrc` at the project root with `legacy-peer-deps=true`. This tells npm to skip strict peer dep enforcement — the standard resolution for this class of issue.  
**File added:** `.npmrc`

---


### BUG-001 — Hydration error on DndContext
**Severity:** Medium  
**Status:** ✅ Fixed  
**Symptom:** React hydration mismatch warning in console on the practicals editor page. Caused @dnd-kit's `DndContext` to fire twice on mount.  
**Root cause:** `DndContext` was rendering on server but accessing `window` properties during hydration.  
**Fix:** Wrapped drag-and-drop UI in a `mounted` state check (`const [mounted, setMounted] = useState(false)` + `useEffect(() => setMounted(true), [])`) so it only renders after hydration.

---

### BUG-002 — `manual.pdf_url` vs `manual.file_url` type mismatch
**Severity:** Low  
**Status:** ✅ Fixed  
**Symptom:** TypeScript error `Property 'pdf_url' does not exist on type 'Manual'` in the manuals detail page settings panel.  
**Root cause:** The `Manual` interface in `lib/types/api.ts` uses `file_url`, not `pdf_url`. The component had the wrong property name.  
**Fix:** Updated `SettingsPanel` to use `manual.file_url` consistently.

---

### BUG-003 — `(manual as any).tags` unnecessary cast
**Severity:** Low  
**Status:** ✅ Fixed  
**Symptom:** `as any` cast in manuals detail page suppressing TypeScript checking on tags field.  
**Root cause:** Defensive coding from when `tags` wasn't in the `Manual` type. Was added later but cast remained.  
**Fix:** Removed `as any` — `Manual.tags` is already typed as `string[]`.

---

### BUG-004 — Blue brand colour remnants after purple migration
**Severity:** Low  
**Status:** ✅ Fixed  
**Symptom:** Several `blue-600`, `blue-700` Tailwind classes remained in manuals pages after the brand colour migration to purple.  
**Root cause:** `sed` replacement pass missed instances inside JSX prop strings.  
**Fix:** Second pass of targeted replacements. Remaining `blue-*` classes (O-Level pill, subject badge) are intentional — they are informational category badges, not interactive elements.

---

### BUG-005 — Filter modal search inputs not pill-shaped on mobile
**Severity:** Low  
**Status:** ✅ Fixed  
**Symptom:** Search inputs appeared rectangular on mobile viewports despite design spec requiring pill shape.  
**Root cause:** `rounded-lg` used instead of `rounded-full` on pill-style inputs.  
**Fix:** Updated filter inputs to use `rounded-full` on mobile breakpoints.

---

### BUG-006 — `useEffect` not resetting chapterId on manual change
**Severity:** Medium  
**Status:** ✅ Fixed  
**Symptom:** On the Create Practical form, changing the selected manual did not clear the previously selected chapter — the stale chapter ID was submitted with the new manual, causing a backend FK violation.  
**Root cause:** Missing `useEffect` dependency tracking `manualId`.  
**Fix:** Added `useEffect(() => { setChapterId(''); }, [manualId])` to reset chapter whenever manual changes.

---

## Open bugs

### BUG-007 — Payments page returns 500
**Severity:** High  
**Status:** 🔴 Open — backend fix required  
**Symptom:** `GET /admin/payments` returns HTTP 500. The payments page shows an error banner.  
**Root cause:** Supabase FK ambiguity — the `payments` table has multiple foreign keys to `users`. The backend query `.select('*, users(*)')` is ambiguous; Supabase doesn't know which FK to use.  
**Frontend mitigation:** Error banner shown with explanation: "Backend fix needed: FK ambiguity on payments ↔ users join."  
**Backend fix:** In `admin.controller.js` around line 462, change:
```js
// Bad
.select('*, users(*)')

// Fixed
.select('*, users!payments_user_id_fkey(*)')
```
**Owner:** Backend developer  
**Workaround:** Query stats endpoint (`/admin/payments/stats`) works — stat cards still load. Only the transaction list is broken.

---

### BUG-008 — Manuals RLS blocks admin inserts
**Severity:** High  
**Status:** 🔴 Open — backend/DB fix required  
**Symptom:** `POST /admin/manuals` returns 403 or silently fails to insert when RLS is enabled on the Supabase `manuals` table.  
**Root cause:** Supabase Row Level Security default policy denies all writes. No admin policy exists on the `manuals` table.  
**Fix option A (recommended):** Use the Supabase service role key in the backend admin controller — bypasses RLS entirely.  
**Fix option B:** Add an explicit RLS policy:
```sql
CREATE POLICY admin_manage_manuals ON manuals
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');
```
**Owner:** Backend developer / DB admin

---

### BUG-009 — Past questions RLS blocks admin inserts
**Severity:** High  
**Status:** 🔴 Open — same root cause as BUG-008  
**Symptom:** `POST /admin/past-questions` fails silently or returns 403.  
**Fix:** Same as BUG-008 — use service role key or add explicit RLS policy on `past_questions` table.  
**Owner:** Backend developer / DB admin

---

### BUG-010 — MUI packages still in package.json
**Severity:** Low  
**Status:** 🟡 Open — cleanup needed  
**Symptom:** `package.json` still lists `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled` as dependencies (~300 KB gzipped), even though all MUI usage has been replaced by Tailwind CSS.  
**Impact:** Bloated `node_modules` and slightly larger bundle if tree-shaking misses any import.  
**Fix:**
```bash
npm uninstall @mui/material @mui/icons-material @emotion/react @emotion/styled
```
Then run `npm run build` to confirm nothing breaks.  
**Owner:** Frontend developer  
**Risk:** Low — grep the codebase first: `grep -r "@mui" src/` to confirm no remaining imports.

---

### BUG-011 — Sidebar badges not updated for support tickets
**Severity:** Low  
**Status:** 🟡 Open  
**Symptom:** The sidebar shows the pending mentor count as a badge (red dot), but the support ticket badge (`openTickets`) is always 0 — the dashboard endpoint doesn't return open ticket count in the current response shape.  
**Root cause:** `DashboardData.stats` has no `openTickets` field. The `Sidebar.tsx` fetches dashboard stats and reads `stats.pendingMentors` correctly, but `openTickets` falls back to `0`.  
**Fix option A:** Add `openTickets` to the `/admin/dashboard` response.  
**Fix option B:** Make a separate call in the sidebar to `GET /admin/support?status=open&limit=1` and read the `pagination.total`.  
**Owner:** Full-stack — needs backend change or second API call.

---

### BUG-012 — Section auto-save fires on unmount
**Severity:** Low  
**Status:** 🟡 Open  
**Symptom:** When the admin clicks away from a section (selecting a different section in the sidebar), the debounced save timer fires after unmount, attempting to PATCH a section that is no longer in the DOM. This causes a React state update on unmounted component warning.  
**Root cause:** The `useDebouncedSave` hook's `useEffect` cleanup does `clearTimeout` but the save call has already been captured in a closure.  
**Fix:** Add an `isMounted` ref to the hook and check it before calling the API:
```ts
const isMounted = useRef(true);
useEffect(() => () => { isMounted.current = false; }, []);
// In save: if (!isMounted.current) return;
```
**Owner:** Frontend developer

---

### BUG-013 — Topic drag-drop loses position on rapid drags
**Severity:** Low  
**Status:** 🟡 Open  
**Symptom:** If the admin drags a topic card quickly (before the previous PATCH request completes), the topic may snap back to its old position.  
**Root cause:** The optimistic local state update is correct, but the invalidation after `PATCH` triggers a refetch that overwrites the local state with stale server data if the server hasn't processed the update yet.  
**Fix:** Use `useMutation.onMutate` for optimistic update + `onError` rollback, and disable `refetchOnSuccess` for reorder mutations:
```ts
const reorderMutation = useMutation({
  mutationFn: ...,
  onSuccess: () => {}, // don't invalidate — trust optimistic update
  onError: () => { setLocalTopics(originalTopics); } // rollback on error
});
```
**Owner:** Frontend developer
