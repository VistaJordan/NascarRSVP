# NASCAR Race Weekend RSVP — Seamless FM

RSVP microsite for the Seamless FM client hospitality weekend at Homestead-Miami
Speedway, November 6–8, 2026. Single-page scroll experience (lights-out intro →
scroll-scrubbed car launch → RSVP form → drift celebration), a serverless API,
Postgres storage, and a private admin dashboard.

## Structure

| Path | What it is |
|---|---|
| `index.html` | The RSVP page (self-contained — fonts from Google Fonts, all media inlined) |
| `admin.html` | Admin dashboard: response stats, table, CSV export, delete |
| `api/rsvp.js` | `POST /api/rsvp` — validates and stores a submission |
| `api/admin/rsvps.js` | `GET`/`DELETE /api/admin/rsvps` — list/remove responses (Bearer `ADMIN_KEY`) |
| `logo.webp` | Header logo (white-on-transparent lockup) |
| `Site/frames/` | Source WebP frames for the scroll animation (not deployed) |
| `Design Options/` | The five original design mockups (not deployed) |
| `UI Essentials/` | Brand kit + logo/mascot sources (not deployed) |
| `*.mp4` | Raw generated footage (not deployed) |

`.vercelignore` keeps design sources and raw media out of the deployment.

## Deploy (Vercel)

1. Import this repo at vercel.com/new (or `vercel --prod` with the CLI).
2. **Database** — in the Vercel project: *Storage → Create Database → Neon (Postgres)*
   and connect it. That injects `DATABASE_URL` / `POSTGRES_URL` automatically.
   The API creates its own `rsvps` table on first use; no migrations needed.
3. **Admin key** — *Settings → Environment Variables*: add `ADMIN_KEY` with a long
   random value (this is the password for `admin.html`).
4. Redeploy after adding the env vars.

## Use

- Send guests the deployment URL (the email invite links here).
- **Per-client invites:** give each client their own link —
  `https://rsvp.seamlessfm.com/?c=<client>` (lowercase letters, numbers, hyphens).
  The confirmation screen plays `drift/<client>.mp4` — that client's store-drift
  celebration — falling back to `drift/default.mp4` if no clip exists, and the
  response row is tagged with the invite slug in the admin view.
  To add a client: generate their clip (see the Drift Clip Playbook), process it
  (watermark removal + compression, per Media pipeline below), save it as
  `drift/<client>.mp4`, push.
- Open `/admin.html`, enter the `ADMIN_KEY`, and you get live stats
  (yes / no / dietary needs / assistance requests), the full response table,
  CSV export, and per-row delete.
- Until the database is connected, the page still works but shows guests an
  honest "response wasn't saved" note in the confirmation overlay.

## Media pipeline (for regenerating animation assets)

- Scroll-scrub frames: `ffmpeg -i <clip>.mp4 -vf "fps=15,delogo=x=1118:y=545:w=104:h=90" -c:v libwebp -quality 70 frames/f_%03d.webp`,
  then base64 into the `SEQUENCE` var in `index.html`.
- Drift confirmation clip: `ffmpeg -i Drift.mp4 -vf "delogo=..." -an -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p out.mp4`,
  then base64 into the `DRIFT` var. (Watermark position can shift between
  generations — check a frame before trusting the delogo coordinates.)
