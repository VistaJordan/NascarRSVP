import { neon } from '@neondatabase/serverless';

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const DIETARY = ['none', 'vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher', 'other'];

async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS rsvps (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      rsvp TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      dietary TEXT,
      dietary_notes TEXT,
      assistance TEXT
    )`;
}

function str(v, max) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s || s.length > max) return null;
  return s;
}

function optStr(v, max) {
  if (v == null || v === '') return '';
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (s.length > max) return null;
  return s;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!DB_URL) {
    return res.status(503).json({ error: 'Database not configured — connect Postgres in Vercel and redeploy' });
  }

  const b = req.body || {};
  const rsvp = b.rsvp === 'yes' || b.rsvp === 'no' ? b.rsvp : null;
  const firstName = str(b.firstName, 200);
  const lastName = str(b.lastName, 200);
  const company = str(b.company, 200);
  const role = str(b.role, 200);
  const phone = str(b.phone, 50);
  const email = str(b.email, 320);
  const dietary = DIETARY.includes(b.dietary) ? b.dietary : 'other';
  const dietaryNotes = optStr(b.dietaryNotes, 500);
  const assistance = optStr(b.assistance, 2000);

  if (!rsvp || !firstName || !lastName || !company || !role || !phone || !email ||
      dietaryNotes === null || assistance === null || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid submission' });
  }

  try {
    const sql = neon(DB_URL);
    await ensureTable(sql);
    await sql`
      INSERT INTO rsvps (rsvp, first_name, last_name, company, role, phone, email, dietary, dietary_notes, assistance)
      VALUES (${rsvp}, ${firstName}, ${lastName}, ${company}, ${role}, ${phone}, ${email}, ${dietary}, ${dietaryNotes}, ${assistance})`;
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('rsvp insert failed:', err);
    return res.status(500).json({ error: 'Could not save response' });
  }
}
