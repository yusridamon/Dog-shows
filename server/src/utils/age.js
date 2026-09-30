// Age helpers used for configurable class assignment.
// Age is calculated on the show date and expressed in whole months so that
// admin-defined class age ranges (minAgeMonths / maxAgeMonths) can be applied
// consistently across shows.

function monthsBetween(dateOfBirth, showDate) {
  const dob = new Date(dateOfBirth);
  const show = new Date(showDate);

  let months =
    (show.getFullYear() - dob.getFullYear()) * 12 +
    (show.getMonth() - dob.getMonth());

  // If the day-of-month on the show date is earlier than the birth day,
  // the dog has not yet completed the final month.
  if (show.getDate() < dob.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}

// Given the configured classes for a show, pick the class that matches the
// dog's sex and whose age range contains the dog's age on the show date.
// Returns the matching ShowClass or null when nothing fits.
function findMatchingClass(classes, { sex, dateOfBirth }, showDate) {
  const ageMonths = monthsBetween(dateOfBirth, showDate);

  const candidates = classes.filter((c) => c.sex === sex);

  for (const c of candidates) {
    const minOk = c.minAgeMonths == null || ageMonths >= c.minAgeMonths;
    const maxOk = c.maxAgeMonths == null || ageMonths <= c.maxAgeMonths;
    if (minOk && maxOk) {
      return c;
    }
  }

  return null;
}

module.exports = { monthsBetween, findMatchingClass };
