import { timingSafeEqual } from 'node:crypto';
import { DB_URL, getSql, ensureTable } from '../_lib/db.js';

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
  if (!DB_URL) {
    return res.status(503).json({ error: 'Database not configured — connect Postgres in Vercel and redeploy' });
  }

  try {
    const sql = getSql();

    if (req.method === 'GET') {
      await ensureTable(sql);
      const rows = await sql`SELECT * FROM rsvps ORDER BY created_at DESC`;
      return res.status(200).json({ rows });
    }

    if (req.method === 'DELETE') {
      const id = parseInt(req.query.id, 10);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: 'Invalid id' });
      }
      await ensureTable(sql);
      await sql`DELETE FROM rsvps WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('admin rsvps failed:', err);
    return res.status(500).json({ error: 'Database error' });
  }
}
