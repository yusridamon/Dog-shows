const prisma = require('./prisma');

/**
 * Recompute catalogue numbers for a show.
 *
 * Numbering is per sex (D = dog/male, B = bitch/female) and starts at 1 with the
 * YOUNGEST dog. Ordering within a sex:
 *   1. by class, youngest class first (class minAgeMonths ascending; unclassified last)
 *   2. within a class, youngest dog first (date of birth descending)
 *   3. stable tie-break by entry id
 *
 * Only APPROVED and COMPLETED entries are numbered. Because the number depends on
 * the whole ordered set, it is recomputed whenever entries change (approve,
 * withdraw, reject, class change, DOB edit), so inserting a younger dog pushes
 * older dogs down (e.g. a Veteran that was D1 becomes D2 when a Baby Puppy is added).
 */
async function renumberShow(showId) {
  const entries = await prisma.showEntry.findMany({
    where: { showId, status: { in: ['APPROVED', 'COMPLETED'] } },
    include: { showClass: true },
  });

  const classRank = (e) => {
    // Youngest class first. Use the class minimum age; entries without a class go last.
    if (!e.showClass) return Number.POSITIVE_INFINITY;
    return e.showClass.minAgeMonths;
  };

  const bySex = { DOG: [], BITCH: [] };
  for (const e of entries) {
    const key = e.sex === 'BITCH' ? 'BITCH' : 'DOG';
    bySex[key].push(e);
  }

  // Build the target ordering per sex.
  const desired = []; // { id, number, code }
  for (const [sex, list] of Object.entries(bySex)) {
    list.sort((a, b) => {
      const ra = classRank(a);
      const rb = classRank(b);
      if (ra !== rb) return ra - rb;               // youngest class first
      const da = new Date(a.dateOfBirth).getTime();
      const db = new Date(b.dateOfBirth).getTime();
      if (da !== db) return db - da;               // youngest dog first (later DOB first)
      return a.id - b.id;                          // stable tie-break
    });

    const prefix = sex === 'BITCH' ? 'B' : 'D';
    list.forEach((e, idx) => {
      desired.push({ id: e.id, current: e.catalogueNumber, number: idx + 1, code: `${prefix}${idx + 1}` });
    });
  }

  const changed = desired.filter((d) => {
    const e = entries.find((x) => x.id === d.id);
    return !e || e.catalogueNumber !== d.number || e.catalogueCode !== d.code;
  });
  if (changed.length === 0) return;

  // Two-phase to avoid transient collisions with the @@unique([showId, sex, catalogueNumber])
  // constraint (e.g. when two dogs swap positions): clear the affected numbers first,
  // then assign the new ones.
  await prisma.$transaction([
    ...changed.map((d) =>
      prisma.showEntry.update({
        where: { id: d.id },
        data: { catalogueNumber: null, catalogueCode: null },
      })
    ),
    ...changed.map((d) =>
      prisma.showEntry.update({
        where: { id: d.id },
        data: { catalogueNumber: d.number, catalogueCode: d.code },
      })
    ),
  ]);
}

module.exports = { renumberShow };
