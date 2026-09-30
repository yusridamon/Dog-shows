// Imports the central dog database from a CSV export of the Excel "test" sheet.
//
// Usage:
//   1. In Excel, "Save As" / "Export" the sheet to CSV (headers on row 1).
//   2. Place the file at  server/data/dogs.csv
//   3. Run:  npm run db:import-dogs
//
// The header matcher below understands common column-name variants. If your
// Excel headers differ, add them to the HEADER_MAP aliases.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const prisma = require('../lib/prisma');

const CSV_PATH = path.join(__dirname, '..', '..', 'data', 'dogs.csv');

// Canonical field -> accepted header aliases (lowercased, trimmed).
const HEADER_MAP = {
  registrationNumber: ['registration number', 'registration no', 'reg number', 'reg no', 'regno', 'registration', 'reg'],
  name: ['registered name', 'name', 'dog name', 'dogs name', 'call name'],
  sex: ['sex', 'gender'],
  dateOfBirth: ['date of birth', 'dob', 'birth date', 'born'],
  breed: ['breed'],
  sire: ['sire', 'father'],
  dam: ['dam', 'mother'],
  owner: ['owner', 'owners', 'owner name'],
  breeder: ['breeder'],
  color: ['colour', 'color'],
};

// Minimal CSV parser handling quoted fields and commas within quotes.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
    } else if (ch === '\r') {
      // ignore
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function buildColumnIndex(headers) {
  const idx = {};
  headers.forEach((h, i) => {
    const key = h.trim().toLowerCase();
    for (const [field, aliases] of Object.entries(HEADER_MAP)) {
      if (aliases.includes(key)) idx[field] = i;
    }
  });
  return idx;
}

function normalizeSex(value) {
  const v = (value || '').trim().toLowerCase();
  if (['b', 'bitch', 'female', 'f'].includes(v)) return 'BITCH';
  return 'DOG';
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value.trim());
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`No CSV found at ${CSV_PATH}`);
    console.error('Export the Excel "test" sheet to CSV and place it there, then re-run.');
    process.exit(1);
  }

  const text = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCsv(text);
  if (rows.length < 2) {
    console.error('CSV appears to have no data rows.');
    process.exit(1);
  }

  const headers = rows[0];
  const col = buildColumnIndex(headers);

  if (col.registrationNumber == null) {
    console.error('Could not find a "registration number" column. Headers seen:');
    console.error(headers.join(' | '));
    console.error('Add your header alias to HEADER_MAP in importDogs.js.');
    process.exit(1);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const get = (field) => (col[field] != null ? (cells[col[field]] || '').trim() : '');

    const registrationNumber = get('registrationNumber');
    const name = get('name');
    const dob = parseDate(get('dateOfBirth'));

    if (!registrationNumber || !name || !dob) {
      skipped++;
      continue;
    }

    const data = {
      name,
      sex: normalizeSex(get('sex')),
      dateOfBirth: dob,
      breed: get('breed') || null,
      sire: get('sire') || null,
      dam: get('dam') || null,
      owner: get('owner') || null,
      breeder: get('breeder') || null,
      color: get('color') || null,
    };

    const existing = await prisma.dog.findUnique({ where: { registrationNumber } });
    if (existing) {
      await prisma.dog.update({ where: { registrationNumber }, data });
      updated++;
    } else {
      await prisma.dog.create({ data: { registrationNumber, ...data } });
      created++;
    }
  }

  console.log(`Import complete. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
