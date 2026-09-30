/**
 * Seed an admin user, default grades, and one example show with configurable
 * classes so the system is usable immediately. Class age ranges are stored in
 * the DB (configurable), not hard-coded in the frontend.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');

async function main() {
  // Admin
  const email = 'admin@dogshows.test';
  const password = await bcrypt.hash('admin123', 10);
  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: { email, password, name: 'Show Admin', role: 'admin' },
  });
  console.log(`Admin: ${email} / admin123`);

  // Grades (configurable, seeded with the common set + V used at specialist shows)
  const grades = ['V (Excellent)', 'Excellent', 'Very Good', 'Good', 'Sufficient', 'Disqualified'];
  for (let i = 0; i < grades.length; i += 1) {
    await prisma.grade.upsert({
      where: { name: grades[i] },
      update: { sortOrder: i },
      create: { name: grades[i], sortOrder: i },
    });
  }
  console.log('Grades seeded.');

  // Example show
  const show = await prisma.show.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'National Dog Show 2026',
      location: 'Johannesburg',
      showDate: new Date('2026-10-15'),
      description: 'Annual national championship show.',
      isPublished: true,
    },
  });

  // Configurable classes for the example show, following the KUSA breed class
  // structure (age in months on show date). These are defaults; officials can
  // change age ranges, add or remove classes per show. Baby/Minor/Puppy/Neutered
  // are not eligible for CC/RCC.
  // Official KUSA breed classes. Age-based classes use months on the show date.
  // Non-age classes use minAgeMonths 0 / maxAgeMonths null and rely on their
  // rules (e.g. born in SA, is the breeder, holds a qualification, is a champion).
  // Baby/Minor/Puppy are not eligible for CC/RCC.
  const classDefs = [
    { name: 'Baby Puppy', minAgeMonths: 4, maxAgeMonths: 6, ccEligible: false, rules: '4 to 6 months.' },
    { name: 'Minor Puppy', minAgeMonths: 6, maxAgeMonths: 9, ccEligible: false, rules: '6 to 9 months.' },
    { name: 'Puppy', minAgeMonths: 9, maxAgeMonths: 12, ccEligible: false, rules: '9 to 12 months.' },
    { name: 'Junior', minAgeMonths: 12, maxAgeMonths: 18, ccEligible: true, rules: '12 to 18 months.' },
    { name: 'Graduate', minAgeMonths: 18, maxAgeMonths: 24, ccEligible: true, rules: '18 to 24 months.' },
    { name: 'SA Bred', minAgeMonths: 24, maxAgeMonths: null, ccEligible: true, rules: 'Over 24 months. Dogs born in South Africa.' },
    { name: 'Imported', minAgeMonths: 24, maxAgeMonths: null, ccEligible: true, rules: 'Over 24 months. Imported dogs.' },
    { name: 'Working', minAgeMonths: 24, maxAgeMonths: null, ccEligible: true, rules: 'Over 24 months. Requires at least an IPO1/IGP1 qualification, Class A, CD, BWT, ITT2/TT2. Proof of qualification must be submitted with the entry form.' },
    { name: 'Breeders', minAgeMonths: 24, maxAgeMonths: null, ccEligible: true, rules: 'Over 24 months. The exhibitor (registered owner) is the breeder.' },
    { name: 'Veteran', minAgeMonths: 84, maxAgeMonths: null, ccEligible: true, rules: 'Over 7 years of age.' },
    { name: 'Open', minAgeMonths: 24, maxAgeMonths: null, ccEligible: true, rules: 'Over 24 months. Open to all eligible dogs.' },
    { name: 'Champion', minAgeMonths: 24, maxAgeMonths: null, ccEligible: true, rules: 'Over 24 months. KUSA Champion.' },
    { name: 'Novelty', minAgeMonths: 0, maxAgeMonths: null, ccEligible: false, rules: 'Best Gait / Best Head / Best Progeny.' },
  ];

  const existingClasses = await prisma.showClass.count({ where: { showId: show.id } });
  if (existingClasses === 0) {
    let sort = 0;
    for (const def of classDefs) {
      for (const sex of ['DOG', 'BITCH']) {
        await prisma.showClass.create({
          data: { showId: show.id, sex, sortOrder: sort, ...def },
        });
      }
      sort += 1;
    }
    console.log('Example show classes seeded.');
  }

  console.log('Seed complete.');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
