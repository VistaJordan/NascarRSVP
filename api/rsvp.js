import { DB_URL, getSql, ensureTable } from './_lib/db.js';

const DIETARY = ['none', 'vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher', 'other'];
const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];

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

  const plusOne = b.plusOne === true;
  const plusOneFirstName = plusOne ? str(b.plusOneFirstName, 200) : '';
  const plusOneLastName = plusOne ? str(b.plusOneLastName, 200) : '';
  const plusOneDietary = plusOne ? (DIETARY.includes(b.plusOneDietary) ? b.plusOneDietary : 'other') : '';

  // transition fallback: pages cached from before the address rollout send no
  // address fields at all — store those rows with a null address (the columns
  // are nullable) instead of dead-ending the guest with a permanent 400.
  // Remove once the invite cache window has passed.
  const legacyNoAddress = b.address1 === undefined && b.city === undefined &&
                          b.state === undefined && b.zip === undefined;
  const address1 = legacyNoAddress ? null : str(b.address1, 200);
  const address2 = legacyNoAddress ? null : optStr(b.address2, 200);
  const city = legacyNoAddress ? null : str(b.city, 100);
  const state = legacyNoAddress ? null : (STATES.includes(b.state) ? b.state : null);
  const zip = legacyNoAddress ? null : (typeof b.zip === 'string' && /^\d{5}(-\d{4})?$/.test(b.zip.trim()) ? b.zip.trim() : null);
  const addressOk = legacyNoAddress || (address1 && address2 !== null && city && state && zip);

  if (!rsvp || !firstName || !lastName || !company || !role || !phone || !email ||
      dietaryNotes === null || assistance === null ||
      plusOneFirstName === null || plusOneLastName === null ||
      !addressOk ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid submission' });
  }

  try {
    const sql = getSql();
    await ensureTable(sql);
    await sql`
      INSERT INTO rsvps (
        rsvp, first_name, last_name, company, role, phone, email,
        dietary, dietary_notes, assistance,
        plus_one, plus_one_first_name, plus_one_last_name, plus_one_dietary,
        address1, address2, city, state, zip
      ) VALUES (
        ${rsvp}, ${firstName}, ${lastName}, ${company}, ${role}, ${phone}, ${email},
        ${dietary}, ${dietaryNotes}, ${assistance},
        ${plusOne}, ${plusOneFirstName}, ${plusOneLastName}, ${plusOneDietary},
        ${address1}, ${address2}, ${city}, ${state}, ${zip}
      )`;
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('rsvp insert failed:', err);
    return res.status(500).json({ error: 'Could not save response' });
  }
}
