/**
 * Default KUSA breed class set applied to every new show.
 * Age values are months on the show date. Non-age classes (SA Bred, Imported,
 * Working, Breeders, Open, Champion) require the dog to be over 24 months.
 * Baby/Minor/Puppy and Novelty are not eligible for CC/RCC.
 *
 * These are defaults only. Officials can edit, add or remove classes per show.
 */
const DEFAULT_CLASS_DEFS = [
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

/**
 * Build the ShowClass create-rows for a show: each class for both sexes,
 * with a shared sortOrder per class so DOG/BITCH group together.
 */
function buildDefaultClassRows(showId) {
  const rows = [];
  DEFAULT_CLASS_DEFS.forEach((def, index) => {
    for (const sex of ['DOG', 'BITCH']) {
      rows.push({ showId, sex, sortOrder: index, ...def });
    }
  });
  return rows;
}

module.exports = { DEFAULT_CLASS_DEFS, buildDefaultClassRows };
