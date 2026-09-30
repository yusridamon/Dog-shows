/**
 * Import the central dog registry from the "test" Excel export into PostgreSQL.
 *
 * Usage:
 *   DOG_IMPORT_FILE=path/to/test.xlsx node prisma/importDogs.js
 * or set DOG_IMPORT_FILE in .env
 *
 * Headers are on row 1. Columns (in order):
 *   REG NO, MICROCHIP, TATTOO, DNA ID NO, DNA PROFILE NO, PRE QUALIFICATIONS,
 *   FULLNAME, POST QUALIFICATIONS, GROUP, BREED, TYPE, SEX, COLOUR, STATUS,
 *   COUNTRY, RESTRICTION, BIRTH DATE, REGISTER DATE, TRANSFER DATE, SIRE REGNO,
 *   SIRE FULLNAME, DAM REGNO, DAM FULLNAME, BREEDER MEMBER NO, BREEDER NAME,
 *   BREEDER POSTAL ADDRESS, BREEDER POST ADDR 1..3, BREEDER POST CODE,
 *   BREEDER HOME PHONE, BREEDER EMAIL, OWNER MEMBER NO, OWNER NAME,
 *   OWNER POSTAL ADDRESS, OWNER POST ADDR 1..3, OWNER POST CODE,
 *   OWNER HOME PHONE, OWNER EMAIL, ID
 */
require('dotenv').config();
const XLSX = require('xlsx');
const prisma = require('../src/lib/prisma');

const FILE = process.env.DOG_IMPORT_FILE;

function s(v) {
  if (v === undefined || v === null) return null;
  const str = String(v).trim();
  return str === '' ? null : str;
}

// XLSX (cellDates:true) returns JS Dates for date-formatted cells.
function d(v) {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v)) return v;
  // Excel serial fallback
  if (typeof v === 'number') {
    const parsed = XLSX.SSF ? XLSX.SSF.parse_date_code(v) : null;
    if (parsed) return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  }
  const asDate = new Date(v);
  return isNaN(asDate) ? null : asDate;
}

async function main() {
  if (!FILE) {
    console.error('Set DOG_IMPORT_FILE in .env or the environment.');
    process.exit(1);
  }

  console.log(`Reading ${FILE} ...`);
  const wb = XLSX.readFile(FILE, { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  console.log(`Found ${rows.length} rows.`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const registrationNumber = s(row['REG NO']);
    const fullName = s(row['FULLNAME']);
    if (!registrationNumber || !fullName) {
      skipped += 1;
      continue;
    }

    const data = {
      registrationNumber,
      microchip: s(row['MICROCHIP']),
      tattoo: s(row['TATTOO']),
      dnaIdNo: s(row['DNA ID NO']),
      dnaProfileNo: s(row['DNA PROFILE NO']),
      preQualifications: s(row['PRE QUALIFICATIONS']),
      fullName,
      postQualifications: s(row['POST QUALIFICATIONS']),
      group: s(row['GROUP']),
      breed: s(row['BREED']),
      type: s(row['TYPE']),
      sex: s(row['SEX']),
      colour: s(row['COLOUR']),
      status: s(row['STATUS']),
      country: s(row['COUNTRY']),
      restriction: s(row['RESTRICTION']),
      birthDate: d(row['BIRTH DATE']),
      registerDate: d(row['REGISTER DATE']),
      transferDate: d(row['TRANSFER DATE']),
      sireRegNo: s(row['SIRE REGNO']),
      sireFullName: s(row['SIRE FULLNAME']),
      damRegNo: s(row['DAM REGNO']),
      damFullName: s(row['DAM FULLNAME']),
      breederMemberNo: s(row['BREEDER MEMBER NO']),
      breederName: s(row['BREEDER NAME']),
      breederPostalAddr: s(row['BREEDER POSTAL ADDRESS']),
      breederPostAddr1: s(row['BREEDER POST ADDR 1']),
      breederPostAddr2: s(row['BREEDER POST ADDR 2']),
      breederPostAddr3: s(row['BREEDER POST ADDR 3']),
      breederPostCode: s(row['BREEDER POST CODE']),
      breederHomePhone: s(row['BREEDER HOME PHONE']),
      breederEmail: s(row['BREEDER EMAIL']),
      ownerMemberNo: s(row['OWNER MEMBER NO']),
      ownerName: s(row['OWNER NAME']),
      ownerPostalAddr: s(row['OWNER POSTAL ADDRESS']),
      ownerPostAddr1: s(row['OWNER POST ADDR 1']),
      ownerPostAddr2: s(row['OWNER POST ADDR 2']),
      ownerPostAddr3: s(row['OWNER POST ADDR 3']),
      ownerPostCode: s(row['OWNER POST CODE']),
      ownerHomePhone: s(row['OWNER HOME PHONE']),
      ownerEmail: s(row['OWNER EMAIL']),
      externalId: s(row['ID']),
      source: 'REGISTRY',
    };

    try {
      const existing = await prisma.dog.findUnique({ where: { registrationNumber } });
      if (existing) {
        await prisma.dog.update({ where: { registrationNumber }, data });
        updated += 1;
      } else {
        await prisma.dog.create({ data });
        created += 1;
      }
    } catch (err) {
      skipped += 1;
      console.warn(`Skipped ${registrationNumber}: ${err.message}`);
    }

    if ((created + updated) % 500 === 0) {
      console.log(`  processed ${created + updated} ...`);
    }
  }

  console.log(`Done. Created ${created}, updated ${updated}, skipped ${skipped}.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
