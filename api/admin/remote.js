import { timingSafeEqual } from 'node:crypto';

// GET /api/admin/remote — responses from a partner deployment of this site,
// so one dashboard can show both. Read-only: rows are fetched live from the
// partner's admin API and never copied into this database.
//
// Env (Vercel → Settings → Environment Variables):
//   REMOTE_ADMIN_URL   partner site origin, e.g. https://example.vercel.app
//   REMOTE_ADMIN_KEY   read-only key issued by the partner
//   REMOTE_LABEL       optional name shown in the Source column (defaults to the hostname)
// With no REMOTE_ADMIN_URL set, this returns an empty list and the dashboard
// behaves exactly as before.

function authorized(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const header = req.headers.authorization || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(provided);
  const b = Buffer.from(key);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (!process.env.ADMIN_KEY) {
    return res.status(503).json({ error: 'ADMIN_KEY is not set — add it in Vercel project settings' });
  }
  if (!authorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const base = (process.env.REMOTE_ADMIN_URL || '').trim().replace(/\/+$/, '');
  const remoteKey = process.env.REMOTE_ADMIN_KEY || '';
  if (!base) {
    return res.status(200).json({ rows: [], source: null });
  }
  if (!remoteKey) {
    return res.status(503).json({ error: 'REMOTE_ADMIN_KEY is not set — add it in Vercel project settings' });
  }

  let source;
  try {
    source = process.env.REMOTE_LABEL || new URL(base).hostname;
  } catch {
    return res.status(503).json({ error: 'REMOTE_ADMIN_URL is not a valid URL' });
  }

  try {
    const upstream = await fetch(base + '/api/admin/rsvps', {
      headers: { Authorization: 'Bearer ' + remoteKey },
      signal: AbortSignal.timeout(10000)
    });
    if (!upstream.ok) {
      console.error('remote rsvps failed:', upstream.status);
      return res.status(502).json({ error: 'Partner site returned HTTP ' + upstream.status, source });
    }
    const data = await upstream.json();
    const rows = Array.isArray(data.rows) ? data.rows.map((r) => ({ ...r, source })) : [];
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ rows, source });
  } catch (err) {
    console.error('remote rsvps failed:', err);
    return res.status(502).json({ error: 'Could not reach partner site', source });
  }
}
