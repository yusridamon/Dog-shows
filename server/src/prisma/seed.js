require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');

// Default configurable grades (admin can add more later).
const GRADES = ['Excellent', 'Very Good', 'Good', 'Sufficient', 'Disqualified'];

// Default class template (from requirement 21). Age ranges in months are
// sensible defaults and remain fully editable per show in the admin portal.
// [name, sex, minAgeMonths, maxAgeMonths]
const CLASS_TEMPLATE = [
  ['Baby Puppy Dogs', 'DOG', 3, 6],
  ['Baby Puppy Bitches', 'BITCH', 3, 6],
  ['Puppy Dogs', 'DOG', 6, 9],
  ['Puppy Bitches', 'BITCH', 6, 9],
  ['Junior Dogs', 'DOG', 9, 18],
  ['Junior Bitches', 'BITCH', 9, 18],
  ['Intermediate Dogs', 'DOG', 18, 24],
  ['Intermediate Bitches', 'BITCH', 18, 24],
  ['Open Dogs', 'DOG', 24, null],
  ['Open Bitches', 'BITCH', 24, null],
  ['Veteran Dogs', 'DOG', 84, null],
  ['Veteran Bitches', 'BITCH', 84, null],
];

async function main() {
  // Admin user
  const email = process.env.ADMIN_EMAIL || 'admin@dogshows.local';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const name = process.env.ADMIN_NAME || 'Show Administrator';
  const hashed = await bcrypt.hash(password, 10);

  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: { email, password: hashed, name, role: 'admin' },
  });
  console.log(`Admin ready: ${email}`);

  // Grades
  for (let i = 0; i < GRADES.length; i++) {
    await prisma.grade.upsert({
      where: { name: GRADES[i] },
      update: { sortOrder: i },
      create: { name: GRADES[i], sortOrder: i },
    });
  }
  console.log(`Grades ready: ${GRADES.join(', ')}`);

  // Sample show with the default class template
  const existing = await prisma.show.findFirst({ where: { name: 'National Dog Show 2026' } });
  if (!existing) {
    const show = await prisma.show.create({
      data: {
        name: 'National Dog Show 2026',
        location: 'Main Showgrounds',
        description: 'The 2026 National Dog Show.',
        showDate: new Date('2026-10-15'),
        judgeName: 'Judge Example',
        isPublished: true,
      },
    });
    let sort = 0;
    for (const [cname, sex, min, max] of CLASS_TEMPLATE) {
      await prisma.showClass.create({
        data: {
          showId: show.id,
          name: cname,
          sex,
          minAgeMonths: min,
          maxAgeMonths: max,
          sortOrder: sort++,
        },
      });
    }
    console.log('Sample show created: National Dog Show 2026 with default classes');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
