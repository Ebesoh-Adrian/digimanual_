# Contributing Guide

Patterns, naming rules, and step-by-step instructions for adding new features to the DigiManual admin dashboard.

---

## Code style

### General rules
- TypeScript strict mode — no `any` unless documenting a workaround
- No `console.log` in committed code
- No TODO comments — either fix it or open a bug in BUGS.md
- No half-finished implementations — every feature must be complete before merging
- No extra abstractions beyond what the task requires
- Comments only when the *why* is non-obvious (invariant, workaround, hidden constraint)

### Naming conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| React components | PascalCase | `CreateModal`, `ActionMenu` |
| Page files | `page.tsx` | `app/dashboard/groups/page.tsx` |
| Hooks | camelCase prefixed `use` | `useDebouncedSave` |
| Zustand stores | camelCase + `Store` | `authStore`, `sidebarStore` |
| API response extractors | `extract` + noun | `extractPracticals`, `extractPag` |
| TypeScript interfaces | PascalCase | `SupportTicket`, `MentorProfile` |
| Query keys | `['admin', 'noun', filters]` | `['admin', 'practicals', { search, page }]` |
| Utility functions | camelCase | `formatXAF`, `formatDate`, `getErrorMessage` |
| CSS: Tailwind only | No custom CSS files | Use `globals.css` only for base/variable overrides |

### Import order
```ts
// 1. React / Next.js
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

// 3. Internal — lib
import api from '@/lib/api/client';
import { formatDate } from '@/lib/utils';

// 4. Internal — types
import type { ApiResponse, Manual } from '@/lib/types/api';

// 5. Internal — components
import { MyComponent } from '@/components/...';
```

---

## How to add a new dashboard page

Follow this exact pattern. Example: adding a "Leaderboard" page at `/dashboard/leaderboard`.

### Step 1 — Create the directory and file
```bash
mkdir app/dashboard/leaderboard
touch app/dashboard/leaderboard/page.tsx
```

### Step 2 — Add `'use client'` and the page scaffold
```tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import type { ApiResponse } from '@/lib/types/api';

// Define the type for this resource
interface LeaderboardEntry {
  id: string;
  display_name: string;
  points: number;
  rank: number;
}

// Defensive extractor
function extract(raw: unknown): LeaderboardEntry[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  const list = r['entries'] ?? r['leaderboard'] ?? r['data'] ?? r['items'];
  if (Array.isArray(list)) return list as LeaderboardEntry[];
  if (Array.isArray(raw)) return raw as LeaderboardEntry[];
  return [];
}

export default function LeaderboardPage() {
  // state, queries, mutations...
  return (
    <div className="space-y-6">
      {/* header → stat cards → filters → table → modals */}
    </div>
  );
}
```

### Step 3 — Add to the sidebar
In `components/layout/Sidebar.tsx`, add to `buildNavItems`:
```tsx
import { Trophy } from 'lucide-react'; // pick appropriate icon

{ label: 'Leaderboard', icon: <Trophy size={18} />, path: '/dashboard/leaderboard', section: 'Engagement' },
```

### Step 4 — Add the type to `lib/types/api.ts`
```ts
export interface LeaderboardEntry {
  id: string;
  display_name: string;
  points: number;
  rank: number;
}
```

### Step 5 — Add to `docs/ARCHITECTURE/API.md`
Document the endpoint(s) used by the new page.

### Step 6 — Add to `docs/FEATURES/CURRENT_FEATURES.md`
Document the new feature with UI description and API calls.

---

## How to add a new section type editor

The `components/practicals/SectionEditor.tsx` `SectionContentEditor` is a switch on `section.type`.

### Step 1 — Add the type string to the backend
The `type` column on `sections` is free text — add the new type name in the backend's template scaffolding and the section creation UI.

### Step 2 — Add a case to `SectionContentEditor`
```tsx
// In SectionContentEditor switch:
case 'timeline': return <TimelineEditor section={section} save={save} />;
```

### Step 3 — Write the editor component
```tsx
function TimelineEditor({ section, save }: EditorProps) {
  const [events, setEvents] = useState<string[]>(
    section.content?.events ?? ['']
  );
  // Auto-save on change
  useEffect(() => { save({ content: { events } }); }, [events]);

  return (
    <div className="space-y-3">
      {events.map((e, i) => (
        <input key={i} value={e}
          onChange={(ev) => setEvents((prev) => prev.map((v, j) => j === i ? ev.target.value : v))}
          className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm" />
      ))}
      <button onClick={() => setEvents((prev) => [...prev, ''])} className="text-sm text-purple-600">+ Add event</button>
    </div>
  );
}
```

### Step 4 — Add the type to the Add Section modal dropdown in the editor

---

## How to add a new modal

All modals follow the same structural pattern:

```tsx
function MyModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ field: '' });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.post('/admin/resource', form);
      toast.success('Done!');
      onDone();
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0]">
          <h2 className="font-semibold text-slate-900">Modal Title</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        {/* body */}
        <div className="p-6 space-y-4">
          {/* form fields */}
        </div>
        {/* footer */}
        <div className="px-6 py-4 border-t border-[#e2e8f0] flex gap-3 justify-end">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-slate-300 text-sm text-gray-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={loading}
            className="h-10 px-5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-60">
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

Render it conditionally in the page:
```tsx
{showModal && <MyModal onClose={() => setShowModal(false)} onDone={refresh} />}
```

---

## File uploads

Always use `multipart/form-data` with the explicit header:

```tsx
const fd = new FormData();
fd.append('fieldName', file);
await api.post('/admin/endpoint', fd, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

Never send files as base64 strings — the API expects multipart.

---

## API query keys

Use consistent query key structure so invalidations work correctly:

```ts
// List queries
queryKey: ['admin', 'manuals', { search, level, page }]

// Detail queries
queryKey: ['admin', 'manual', manualId]

// Nested list
queryKey: ['admin', 'topics', manualId]

// Stats
queryKey: ['admin', 'payment-stats']
```

When a mutation succeeds, invalidate the relevant key:
```ts
onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'manuals'] })
```

This invalidates ALL manual queries (list + detail + stats) due to partial key matching.

---

## Styling rules

### Colours
| Use case | Class |
|---------|-------|
| Primary buttons | `bg-purple-600 hover:bg-purple-700` |
| Danger buttons | `bg-red-600 hover:bg-red-700` |
| Success state | `bg-green-500` or `text-green-700 bg-green-100` |
| Borders | `border-[#e2e8f0]` |
| Table header bg | `bg-[#f8fafc]` |
| Row hover | `hover:bg-purple-50/20` |
| Active nav item | `bg-[#2d6a4f]` (sidebar only — dark green) |

### Component sizing
| Element | Standard |
|---------|---------|
| Buttons | `h-10` (40px) default, `h-9` small, `h-11` large |
| Text inputs | `h-10 px-3` |
| Rounded containers | `rounded-xl` (cards), `rounded-lg` (inputs), `rounded-2xl` (modals) |
| Modal max-width | `max-w-sm` (simple), `max-w-md` (forms), `max-w-lg` (complex forms) |
| Table row hover | Always add `transition-colors` |
| Skeleton loader | `h-4 bg-gray-100 rounded animate-pulse` |

### Never use
- Inline `style={{}}` prop — use Tailwind classes only
- `!important` in any CSS
- MUI components — use Tailwind equivalents
- Fixed pixel widths except for known fixed elements (e.g. sidebar `w-64`, settings panel `w-[320px]`)

---

## Common gotchas

### 1. `'use client'` is required on every page
Next.js 16 App Router defaults to Server Components. Since all pages use Zustand, hooks, and browser APIs, every file needs `'use client'` at the top.

### 2. `extract()` before mapping
Never call `.map()` directly on raw API response data. Always pass through `extract()` first:
```tsx
// Bad
const manuals = data.manuals.map(...)

// Good
const manuals = extract(data); // returns [] if any shape is wrong
manuals.map(...)
```

### 3. Study group announcements use `content`, not `message`
```ts
// Bad — API returns 400
api.post(`/admin/groups/${id}/announce`, { message: text })

// Good
api.post(`/admin/groups/${id}/announce`, { content: text })
```

### 4. File uploads need explicit Content-Type header
Axios doesn't always set the right boundary for multipart without the header:
```ts
// Bad — may fail or send wrong boundary
api.post('/upload', formData)

// Good
api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
```

### 5. Sidebar badge for support tickets is currently stuck at 0
`openTickets` state in `Sidebar.tsx` is never set — the dashboard API doesn't return it. Work around by making a second call or wait for BUG-011 fix.

### 6. `formatXAF(null)` is safe — `formatXAF(undefined)` is safe
Both return `"0 XAF"`. The function handles nullable amounts. Same for `formatDate(null)`.

### 7. TanStack Query v5 API differences from v4
- `cacheTime` is now `gcTime`
- `isLoading` is `true` only on first load (no cache); use `isFetching` for refetch indicator
- `onSuccess`/`onError` callbacks moved from `useQuery` to `useMutation` only
- `status: 'loading'` is now `status: 'pending'`

### 8. Zustand v5 has no default shallow comparison
```ts
// Bad — re-renders on every store change
const { user, accessToken } = useAuthStore();

// Good — only re-renders when these specific fields change
const user = useAuthStore((s) => s.user);
const accessToken = useAuthStore((s) => s.accessToken);
```

---

## Branch and commit conventions

```
main          ← production, always deployable
dev           ← integration branch for features
feature/xxx   ← individual feature branches
fix/xxx       ← bug fix branches
```

Commit message format:
```
feat: add leaderboard page with student rankings
fix: resolve payment FK ambiguity in admin controller
chore: remove unused MUI packages from package.json
docs: add leaderboard to CURRENT_FEATURES.md
```

---

## Before opening a PR

- [ ] `npm run build` passes with no errors
- [ ] `npm run lint` passes
- [ ] Feature tested in browser (not just type-checking)
- [ ] Mobile layout checked (Chrome DevTools → responsive mode → 375px width)
- [ ] New API endpoints added to `docs/ARCHITECTURE/API.md`
- [ ] New features added to `docs/FEATURES/CURRENT_FEATURES.md`
- [ ] New bugs discovered added to `docs/OPERATIONS/BUGS.md`
- [ ] No `console.log` statements
- [ ] No `as any` casts without a comment explaining why
