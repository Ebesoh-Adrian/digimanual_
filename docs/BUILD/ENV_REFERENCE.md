# Environment Variable Reference

Create a `.env.local` file in the project root. This file is **never committed** (it's in `.gitignore`).

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://api-production-4804.up.railway.app/api/v1
```

---

## Variables

### `NEXT_PUBLIC_API_URL`

| Field | Value |
|-------|-------|
| **Required** | Yes |
| **Type** | URL string |
| **Prefix** | `NEXT_PUBLIC_` — exposed to the browser bundle |
| **Production** | `https://api-production-4804.up.railway.app/api/v1` |
| **Local dev** | `http://localhost:3001/api/v1` (if running backend locally) |

Used by `lib/api/client.ts` as the `baseURL` for every Axios request. All API calls are relative to this base — e.g. `/admin/manuals` becomes `https://…/api/v1/admin/manuals`.

**Must include** the `/api/v1` path suffix. Without it every request hits the wrong route and returns 404.

---

## Variables that do NOT exist (intentional)

These secrets are deliberately absent from the frontend:

| Secret | Why it's backend-only |
|--------|----------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Never exposed to browser — backend uses it for admin DB writes |
| `SUPABASE_URL` | Frontend never talks to Supabase directly — only via the Railway API |
| `FAPSHI_API_KEY` | Payment gateway key — backend only |
| `MESOMB_API_KEY` | Payment gateway key — backend only |
| `JWT_SECRET` | Used to sign tokens — backend only |

---

## Token storage (not env vars)

The app stores credentials in two places at runtime — neither is an env var:

| Token | Storage | Key | Why |
|-------|---------|-----|-----|
| `accessToken` | Zustand in-memory | n/a | Lost on page refresh by design — prevents XSS theft |
| `refreshToken` | `localStorage` | `digimanual_refresh_token` | Survives refresh; used to silently re-issue access tokens |

---

## Setting up for local backend development

If you're running the backend locally (Node/Express on port 3001):

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

CORS must be enabled on the backend for `http://localhost:3000`.

---

## CI / Vercel

On Vercel, set env vars under **Project → Settings → Environment Variables**. Do not set them in `vercel.json` or commit them.

For preview deployments pointing at the production API, set:
```
NEXT_PUBLIC_API_URL = https://api-production-4804.up.railway.app/api/v1
```
