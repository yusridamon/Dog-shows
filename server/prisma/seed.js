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

  // Official KUSA grading chart (Schedule 5E (21)). Age-dependent:
  //  - 4 to 12 months: VV, VSP, WV
  //  - over 12 months: V, SG, G, GGD, NGGD
  //  - over 6 months: OB (not graded)
  const gradeChart = [
    { name: 'VV', germanName: 'Vielversprechend', englishDescription: 'Very Promising', minAgeMonths: 4, maxAgeMonths: 12, sortOrder: 1,
      explanation: 'May be awarded to a puppy under 12 months of age who already at this young age shows, although not fully developed yet, that it comes very close to the ideal standard of the breed. Must be in excellent condition and show typical characteristics. Have a complete dentition and be of well balanced proportions. Minor imperfections can be ignored.' },
    { name: 'VSP', germanName: 'Versprechend', englishDescription: 'Promising', minAgeMonths: 4, maxAgeMonths: 12, sortOrder: 2,
      explanation: 'May be awarded to a puppy under 12 months of age which, already at this young age, and although not yet fully developed, shows typical features of its breed. A few minor faults may be tolerated but none of the morphological nature.' },
    { name: 'WV', germanName: 'Wenig Versprechend', englishDescription: 'Little Promise', minAgeMonths: 4, maxAgeMonths: 12, sortOrder: 3,
      explanation: 'May be awarded to a puppy under 12 months of age which, already at this young age, and although not yet fully developed, shows that it possesses the main features of its breed, however showing faults and provided these are not concealed.' },
    { name: 'V', germanName: 'Vorzüglich', englishDescription: 'Excellent', minAgeMonths: 12, maxAgeMonths: null, sortOrder: 4,
      explanation: 'May only be awarded to a dog which comes very close to the ideal standard of the breed, which is presented in excellent condition, displays a harmonious, well-balanced temperament, is of high class and has excellent posture. Its superior characteristics in respect of its breed permit that minor imperfections can be ignored; it must however have the typical features of its sex.' },
    { name: 'SG', germanName: 'Sehr Gut', englishDescription: 'Very Good', minAgeMonths: 12, maxAgeMonths: null, sortOrder: 5,
      explanation: 'May only be awarded to a dog which possesses the typical features of its breed, which has well-balanced proportions and is in correct condition. A few minor faults may be tolerated but none of a morphological nature. This award can only be granted to a dog that shows class.' },
    { name: 'G', germanName: 'Gut', englishDescription: 'Good', minAgeMonths: 12, maxAgeMonths: null, sortOrder: 6,
      explanation: 'Is to be awarded to a dog that possesses the main features of its breed however showing faults provided these are not concealed.' },
    { name: 'GGD', germanName: 'Genügend', englishDescription: 'Sufficient', minAgeMonths: 12, maxAgeMonths: null, sortOrder: 7,
      explanation: 'Must be awarded to a dog which corresponds adequately to its breed, without possessing the generally accepted characteristics or whose physical condition leaves something to be desired.' },
    { name: 'NGGD', germanName: 'Nicht Genügend', englishDescription: 'Insufficient', minAgeMonths: 12, maxAgeMonths: null, sortOrder: 8,
      explanation: 'Is given to a dog that presents any disqualifying faults.' },
    { name: 'OB', germanName: 'Ohne Bewertung', englishDescription: 'Not Graded', minAgeMonths: 6, maxAgeMonths: null, sortOrder: 9,
      explanation: 'This grading is to be given to any dog who is impossible to assess the gait and the movement or avoids being examined by the judge and makes it impossible to inspect teeth, anatomy and structure, tail or testicles. This grading is also to be given if traces of operations or treatment can be observed which seem to indicate that the exhibitor wanted to deceive the judge.' },
  ];
  for (const g of gradeChart) {
    await prisma.grade.upsert({
      where: { name: g.name },
      update: { ...g },
      create: { ...g },
    });
  }
  console.log('Grading chart seeded.');

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
