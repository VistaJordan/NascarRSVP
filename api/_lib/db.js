import { neon } from '@neondatabase/serverless';

export const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

export function getSql() {
  return neon(DB_URL);
}

export async function ensureTable(sql) {
  try {
    await migrate(sql);
  } catch (err) {
    // two cold starts can race CREATE TABLE IF NOT EXISTS; the loser's
    // duplicate-key error is harmless once the winner has created the table
    if (!/already exists|duplicate key/i.test(String(err))) throw err;
  }
}

async function migrate(sql) {
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
      assistance TEXT,
      plus_one BOOLEAN NOT NULL DEFAULT false,
      plus_one_first_name TEXT,
      plus_one_last_name TEXT,
      plus_one_dietary TEXT,
      address1 TEXT,
      address2 TEXT,
      city TEXT,
      state TEXT,
      zip TEXT
    )`;
  // columns added after launch — bring a pre-existing table up to date
  await sql`ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS plus_one BOOLEAN NOT NULL DEFAULT false`;
  await sql`ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS plus_one_first_name TEXT`;
  await sql`ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS plus_one_last_name TEXT`;
  await sql`ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS plus_one_dietary TEXT`;
  await sql`ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS address1 TEXT`;
  await sql`ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS address2 TEXT`;
  await sql`ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS city TEXT`;
  await sql`ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS state TEXT`;
  await sql`ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS zip TEXT`;
}
