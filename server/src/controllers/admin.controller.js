const prisma = require('../lib/prisma');
const { determineClass } = require('../lib/classAssignment');
const { renumberShow } = require('../lib/catalogue');
const { buildDefaultClassRows } = require('../lib/defaultClasses');

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
exports.dashboard = async (req, res) => {
  const [shows, pending, approved, dogs] = await Promise.all([
    prisma.show.count(),
    prisma.showEntry.count({ where: { status: 'PENDING' } }),
    prisma.showEntry.count({ where: { status: 'APPROVED' } }),
    prisma.dog.count(),
  ]);
  res.json({ stats: { shows, pendingEntries: pending, approvedEntries: approved, dogs } });
};

// ---------------------------------------------------------------------------
// Show management
// ---------------------------------------------------------------------------
exports.listShows = async (req, res) => {
  const shows = await prisma.show.findMany({
    orderBy: { showDate: 'desc' },
    include: { _count: { select: { entries: true, classes: true } } },
  });
  res.json({ shows });
};

exports.getShow = async (req, res) => {
  const id = Number(req.params.id);
  const show = await prisma.show.findUnique({
    where: { id },
    include: {
      classes: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
      _count: { select: { entries: true, classes: true } },
    },
  });
  if (!show) return res.status(404).json({ message: 'Show not found.' });
  res.json({ show });
};

exports.createShow = async (req, res) => {
  const { name, location, showDate, description, isPublished } = req.body;
  if (!name || !showDate) {
    return res.status(400).json({ message: 'Name and show date are required.' });
  }
  const show = await prisma.show.create({
    data: {
      name,
      location: location || null,
      showDate: new Date(showDate),
      description: description || null,
      isPublished: !!isPublished,
      // Every new show starts with the default KUSA class set (editable per show).
      classes: { create: buildDefaultClassRows(0).map(({ showId, ...c }) => c) },
    },
    include: { classes: true },
  });
  res.status(201).json({ show });
};

exports.updateShow = async (req, res) => {
  const id = Number(req.params.id);
  const { name, location, showDate, description, isPublished } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (location !== undefined) data.location = location;
  if (showDate !== undefined) data.showDate = new Date(showDate);
  if (description !== undefined) data.description = description;
  if (isPublished !== undefined) data.isPublished = !!isPublished;

  const show = await prisma.show.update({ where: { id }, data });
  res.json({ show });
};

exports.deleteShow = async (req, res) => {
  const id = Number(req.params.id);
  await prisma.show.delete({ where: { id } });
  res.json({ message: 'Show deleted.' });
};

// ---------------------------------------------------------------------------
// Class configuration (per show, admin-configurable age ranges & rules)
// ---------------------------------------------------------------------------
exports.createClass = async (req, res) => {
  const showId = Number(req.params.showId);
  const { name, sex, minAgeMonths, maxAgeMonths, ccEligible, sortOrder, rules } = req.body;
  if (!name || !sex || minAgeMonths === undefined) {
    return res.status(400).json({ message: 'Name, sex and minimum age are required.' });
  }
  const showClass = await prisma.showClass.create({
    data: {
      showId,
      name,
      sex,
      minAgeMonths: Number(minAgeMonths),
      maxAgeMonths: maxAgeMonths === '' || maxAgeMonths == null ? null : Number(maxAgeMonths),
      ccEligible: ccEligible === undefined ? true : !!ccEligible,
      sortOrder: sortOrder ? Number(sortOrder) : 0,
      rules: rules || null,
    },
  });
  res.status(201).json({ showClass });
};

exports.updateClass = async (req, res) => {
  const id = Number(req.params.id);
  const { name, sex, minAgeMonths, maxAgeMonths, ccEligible, sortOrder, rules } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (sex !== undefined) data.sex = sex;
  if (minAgeMonths !== undefined) data.minAgeMonths = Number(minAgeMonths);
  if (maxAgeMonths !== undefined) data.maxAgeMonths =
    maxAgeMonths === '' || maxAgeMonths == null ? null : Number(maxAgeMonths);
  if (ccEligible !== undefined) data.ccEligible = !!ccEligible;
  if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);
  if (rules !== undefined) data.rules = rules;

  const showClass = await prisma.showClass.update({ where: { id }, data });
  res.json({ showClass });
};

exports.deleteClass = async (req, res) => {
  const id = Number(req.params.id);
  await prisma.showClass.delete({ where: { id } });
  res.json({ message: 'Class deleted.' });
};

// ---------------------------------------------------------------------------
// Grade configuration
// ---------------------------------------------------------------------------
exports.listGrades = async (req, res) => {
  const grades = await prisma.grade.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json({ grades });
};

exports.createGrade = async (req, res) => {
  const { name, sortOrder } = req.body;
  if (!name) return res.status(400).json({ message: 'Grade name is required.' });
  const grade = await prisma.grade.create({
    data: { name, sortOrder: sortOrder ? Number(sortOrder) : 0 },
  });
  res.status(201).json({ grade });
};

exports.updateGrade = async (req, res) => {
  const id = Number(req.params.id);
  const { name, sortOrder, isActive } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);
  if (isActive !== undefined) data.isActive = !!isActive;
  const grade = await prisma.grade.update({ where: { id }, data });
  res.json({ grade });
};

exports.deleteGrade = async (req, res) => {
  const id = Number(req.params.id);
  await prisma.grade.delete({ where: { id } });
  res.json({ message: 'Grade deleted.' });
};

// ---------------------------------------------------------------------------
// Entry management + admin search
// ---------------------------------------------------------------------------
exports.listEntries = async (req, res) => {
  const {
    showId, status, search, sex, breed, classId,
    registrationNumber, dogName, owner, exhibitor, catalogueNumber,
  } = req.query;

  const where = {};
  if (showId) where.showId = Number(showId);
  if (status) where.status = status;
  if (sex) where.sex = sex;
  if (breed) where.breed = { contains: breed, mode: 'insensitive' };
  if (classId) where.classId = Number(classId);
  if (registrationNumber) where.registrationNumber = { contains: registrationNumber, mode: 'insensitive' };
  if (dogName) where.dogName = { contains: dogName, mode: 'insensitive' };
  if (owner) where.ownerName = { contains: owner, mode: 'insensitive' };
  if (exhibitor) where.exhibitorName = { contains: exhibitor, mode: 'insensitive' };
  if (catalogueNumber) where.catalogueNumber = Number(catalogueNumber);
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
    orderBy: { createdAt: 'desc' },
    include: { show: true, showClass: true, grade: true, critique: true },
  });
  res.json({ entries });
};

exports.getEntry = async (req, res) => {
  const id = Number(req.params.id);
  const entry = await prisma.showEntry.findUnique({
    where: { id },
    include: { show: { include: { classes: true } }, showClass: true, grade: true, critique: true, dog: true },
  });
  if (!entry) return res.status(404).json({ message: 'Entry not found.' });
  res.json({ entry });
};

/**
 * Approve a (manual) entry. The exhibitor selects the class at entry time, so we
 * keep their choice. Only if no class is set (e.g. legacy entries) do we fall back
 * to auto-determining it. Also assigns catalogue numbers and adds manual dogs to
 * the central registry for future lookups.
 */
exports.approveEntry = async (req, res) => {
  const id = Number(req.params.id);
  const entry = await prisma.showEntry.findUnique({
    where: { id },
    include: { show: { include: { classes: true } }, showClass: true },
  });
  if (!entry) return res.status(404).json({ message: 'Entry not found.' });

  // Respect the exhibitor's chosen class; fall back to auto-determination only
  // when no class was selected on the entry.
  const matchedClass = entry.showClass || determineClass(
    entry.show.classes,
    entry.dateOfBirth,
    entry.sex,
    entry.show.showDate
  );

  // If this was a manual entry with no linked registry dog, add it to the registry.
  let dogId = entry.dogId;
  if (!dogId && entry.isManualEntry) {
    const existingDog = await prisma.dog.findUnique({
      where: { registrationNumber: entry.registrationNumber },
    });
    if (existingDog) {
      dogId = existingDog.id;
    } else {
      const created = await prisma.dog.create({
        data: {
          registrationNumber: entry.registrationNumber,
          fullName: entry.dogName,
          sex: entry.sex,
          breed: entry.breed,
          colour: entry.colour,
          microchip: entry.microchip,
          tattoo: entry.tattoo,
          birthDate: entry.dateOfBirth,
          sireFullName: entry.sireName,
          damFullName: entry.damName,
          breederName: entry.breederName,
          ownerName: entry.ownerName,
          source: 'MANUAL',
        },
      });
      dogId = created.id;
    }
  }

  await prisma.showEntry.update({
    where: { id },
    data: {
      status: 'APPROVED',
      classId: matchedClass ? matchedClass.id : entry.classId,
      dogId,
      rejectionReason: null,
      correctionNote: null,
    },
  });

  // Recompute catalogue numbers for the whole show so the youngest dog per sex
  // is D1/B1 and older dogs shift down as younger ones are added.
  await renumberShow(entry.showId);

  const updated = await prisma.showEntry.findUnique({
    where: { id },
    include: { showClass: true },
  });

  res.json({
    entry: updated,
    assignedClass: matchedClass ? matchedClass.name : null,
    warning: matchedClass ? null : 'No configured class matched this dog\'s age/sex.',
  });
};

exports.rejectEntry = async (req, res) => {
  const id = Number(req.params.id);
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ message: 'A rejection reason is required.' });
  const entry = await prisma.showEntry.update({
    where: { id },
    data: { status: 'REJECTED', rejectionReason: reason, catalogueNumber: null, catalogueCode: null },
  });
  await renumberShow(entry.showId);
  res.json({ entry });
};

exports.requestCorrection = async (req, res) => {
  const id = Number(req.params.id);
  const { note } = req.body;
  if (!note) return res.status(400).json({ message: 'A correction note is required.' });
  const entry = await prisma.showEntry.update({
    where: { id },
    data: { correctionNote: note },
  });
  res.json({ entry, message: 'Correction requested.' });
};

exports.withdrawEntry = async (req, res) => {
  const id = Number(req.params.id);
  const entry = await prisma.showEntry.update({
    where: { id },
    data: { status: 'WITHDRAWN', catalogueNumber: null, catalogueCode: null },
  });
  await renumberShow(entry.showId);
  res.json({ entry });
};

/**
 * Edit entry information (dog details, exhibitor, class). Catalogue numbers are
 * derived automatically from age ordering, so they are not set manually here;
 * changing sex, date of birth or class triggers a renumber of the show.
 */
exports.updateEntry = async (req, res) => {
  const id = Number(req.params.id);
  const {
    dogName, sex, dateOfBirth, breed, sireName, damName, ownerName,
    exhibitorName, exhibitorEmail, exhibitorPhone, classId,
  } = req.body;

  const data = {};
  if (dogName !== undefined) data.dogName = dogName;
  if (sex !== undefined) data.sex = sex;
  if (dateOfBirth !== undefined) data.dateOfBirth = new Date(dateOfBirth);
  if (breed !== undefined) data.breed = breed;
  if (sireName !== undefined) data.sireName = sireName;
  if (damName !== undefined) data.damName = damName;
  if (ownerName !== undefined) data.ownerName = ownerName;
  if (exhibitorName !== undefined) data.exhibitorName = exhibitorName;
  if (exhibitorEmail !== undefined) data.exhibitorEmail = exhibitorEmail;
  if (exhibitorPhone !== undefined) data.exhibitorPhone = exhibitorPhone;
  if (classId !== undefined) data.classId = classId ? Number(classId) : null;

  const entry = await prisma.showEntry.update({ where: { id }, data, include: { showClass: true } });

  // Reordering-relevant fields changed: recompute numbers for the whole show.
  if (sex !== undefined || dateOfBirth !== undefined || classId !== undefined) {
    await renumberShow(entry.showId);
  }
  res.json({ entry });
};

/**
 * Record grading against the show entry (never permanently against the dog).
 */
exports.setGrade = async (req, res) => {
  const id = Number(req.params.id);
  const { gradeId, markCompleted } = req.body;
  const data = { gradeId: gradeId ? Number(gradeId) : null };
  if (markCompleted) data.status = 'COMPLETED';
  const entry = await prisma.showEntry.update({
    where: { id },
    data,
    include: { grade: true },
  });
  res.json({ entry });
};

// ---------------------------------------------------------------------------
// Critiques
// ---------------------------------------------------------------------------
/**
 * Create/update a judge critique. Critiques are always saved as drafts here and
 * are NOT published individually. They become public via the show-level bulk
 * publish (publishShowCritiques) at the end of the show. Editing a critique that
 * was already bulk-published keeps its published state.
 */
exports.upsertCritique = async (req, res) => {
  const entryId = Number(req.params.id);
  const { judgeName, text, critiqueDate } = req.body;
  if (!judgeName || !text) {
    return res.status(400).json({ message: 'Judge name and critique text are required.' });
  }

  const entry = await prisma.showEntry.findUnique({ where: { id: entryId } });
  if (!entry) return res.status(404).json({ message: 'Entry not found.' });

  const critique = await prisma.critique.upsert({
    where: { showEntryId: entryId },
    // New critiques start as drafts.
    create: {
      showEntryId: entryId,
      judgeName,
      text,
      isPublished: false,
      critiqueDate: critiqueDate ? new Date(critiqueDate) : new Date(),
    },
    // On edit, don't change publish state (omit isPublished).
    update: {
      judgeName,
      text,
      critiqueDate: critiqueDate ? new Date(critiqueDate) : new Date(),
    },
  });
  res.json({ critique });
};

/**
 * Bulk-publish (or unpublish) all critiques for a show. Used at the end of the
 * show to release all judge critiques at once.
 */
exports.publishShowCritiques = async (req, res) => {
  const showId = Number(req.params.showId);
  const publish = req.body.publish === undefined ? true : !!req.body.publish;

  const result = await prisma.critique.updateMany({
    where: { showEntry: { showId } },
    data: { isPublished: publish },
  });

  res.json({
    count: result.count,
    published: publish,
    message: publish
      ? `Published ${result.count} critique(s).`
      : `Unpublished ${result.count} critique(s).`,
  });
};

// ---------------------------------------------------------------------------
// Central dog registry search (admin)
// ---------------------------------------------------------------------------
exports.searchDogs = async (req, res) => {
  const { q } = req.query;
  const where = q
    ? {
        OR: [
          { registrationNumber: { contains: q, mode: 'insensitive' } },
          { fullName: { contains: q, mode: 'insensitive' } },
          { ownerName: { contains: q, mode: 'insensitive' } },
          { breed: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};
  const dogs = await prisma.dog.findMany({ where, take: 50, orderBy: { fullName: 'asc' } });
  res.json({ dogs });
};

// ---------------------------------------------------------------------------
// Contact messages
// ---------------------------------------------------------------------------
exports.listMessages = async (req, res) => {
  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ messages });
};

exports.markMessageRead = async (req, res) => {
  const id = Number(req.params.id);
  const message = await prisma.contactMessage.update({
    where: { id },
    data: { isRead: true },
  });
  res.json({ message });
};
