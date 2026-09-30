const prisma = require('../lib/prisma');

/**
 * List published shows for the public site.
 */
exports.listShows = async (req, res) => {
  const shows = await prisma.show.findMany({
    where: { isPublished: true },
    orderBy: { showDate: 'desc' },
    select: { id: true, name: true, location: true, showDate: true, description: true },
  });
  res.json({ shows });
};

/**
 * Public detail for a single show (with configured classes for navigation).
 */
exports.getShow = async (req, res) => {
  const id = Number(req.params.id);
  const show = await prisma.show.findFirst({
    where: { id, isPublished: true },
    include: {
      classes: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
    },
  });
  if (!show) return res.status(404).json({ message: 'Show not found.' });
  res.json({ show });
};

/**
 * Look up a dog in the central registry by registration number.
 * Step 2/3 of the entry flow.
 */
exports.lookupDog = async (req, res) => {
  const reg = String(req.query.registrationNumber || '').trim();
  if (!reg) {
    return res.status(400).json({ message: 'Registration number is required.' });
  }

  const dog = await prisma.dog.findUnique({
    where: { registrationNumber: reg },
    select: {
      id: true,
      registrationNumber: true,
      fullName: true,
      sex: true,
      breed: true,
      birthDate: true,
      sireFullName: true,
      damFullName: true,
      ownerName: true,
      colour: true,
    },
  });

  if (!dog) {
    return res.json({ found: false, message: 'Dog not found in our database.' });
  }
  res.json({ found: true, dog });
};

/**
 * Digital catalogue for a show: approved/completed entries only, grouped
 * client-side by Class -> Sex -> Catalogue Number. Supports search & filters.
 */
exports.getCatalogue = async (req, res) => {
  const showId = Number(req.params.showId);
  const { search, sex, breed, classId } = req.query;

  const show = await prisma.show.findFirst({
    where: { id: showId, isPublished: true },
    include: { classes: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } },
  });
  if (!show) return res.status(404).json({ message: 'Show not found.' });

  const where = {
    showId,
    status: { in: ['APPROVED', 'COMPLETED'] },
  };
  if (sex) where.sex = sex;
  if (breed) where.breed = { contains: breed, mode: 'insensitive' };
  if (classId) where.classId = Number(classId);
  if (search) {
    where.OR = [
      { dogName: { contains: search, mode: 'insensitive' } },
      { registrationNumber: { contains: search, mode: 'insensitive' } },
      { exhibitorName: { contains: search, mode: 'insensitive' } },
      { ownerName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const entries = await prisma.showEntry.findMany({
    where,
    orderBy: [{ classId: 'asc' }, { sex: 'asc' }, { catalogueNumber: 'asc' }],
    include: {
      showClass: true,
      grade: true,
      critique: true,
    },
  });

  // Only publish critiques that have been published.
  const cleaned = entries.map((e) => ({
    ...e,
    critique: e.critique && e.critique.isPublished ? e.critique : null,
  }));

  res.json({ show, entries: cleaned });
};

/**
 * Public contact form submission.
 */
exports.createContactMessage = async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: 'Name, email, subject and message are required.' });
  }
  const created = await prisma.contactMessage.create({
    data: { name, email, phone: phone || null, subject, message },
  });
  res.status(201).json({ message: 'Message sent.', id: created.id });
};
