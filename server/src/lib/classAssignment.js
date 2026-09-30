/**
 * Class assignment helpers.
 *
 * Classes and their age ranges are configured per show by an administrator and
 * stored in the ShowClass table. Nothing about classes is hard-coded here or in
 * the frontend. This module only computes a dog's age on the show date and picks
 * the matching configured class.
 */

/**
 * Whole months between two dates (age of dog on the show date).
 */
function ageInMonths(dateOfBirth, onDate) {
  const dob = new Date(dateOfBirth);
  const ref = new Date(onDate);

  let months =
    (ref.getFullYear() - dob.getFullYear()) * 12 +
    (ref.getMonth() - dob.getMonth());

  // If the day-of-month hasn't been reached yet, the dog hasn't completed the month.
  if (ref.getDate() < dob.getDate()) {
    months -= 1;
  }
  return Math.max(0, months);
}

/**
 * Normalise a sex value to DOG | BITCH.
 */
function normaliseSex(sex) {
  if (!sex) return null;
  const s = String(sex).trim().toUpperCase();
  if (s === 'DOG' || s === 'MALE' || s === 'M') return 'DOG';
  if (s === 'BITCH' || s === 'FEMALE' || s === 'F') return 'BITCH';
  return s;
}

/**
 * Given the configured classes for a show, a dog's DOB, sex and the show date,
 * return the matching ShowClass or null when no configured class applies.
 *
 * @param {Array} showClasses - ShowClass rows for the show
 * @param {Date|string} dateOfBirth
 * @param {string} sex
 * @param {Date|string} showDate
 */
function determineClass(showClasses, dateOfBirth, sex, showDate) {
  const age = ageInMonths(dateOfBirth, showDate);
  const dogSex = normaliseSex(sex);

  const candidates = showClasses
    .filter((c) => normaliseSex(c.sex) === dogSex)
    .filter((c) => {
      const minOk = age >= c.minAgeMonths;
      const maxOk = c.maxAgeMonths == null || age < c.maxAgeMonths;
      return minOk && maxOk;
    })
    // Prefer the most specific (highest lower bound) when ranges overlap.
    .sort((a, b) => b.minAgeMonths - a.minAgeMonths);

  return candidates[0] || null;
}

module.exports = { ageInMonths, normaliseSex, determineClass };
