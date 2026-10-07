const prisma = require('../lib/prisma');
const { normaliseSex, ageInMonths } = require('../lib/classAssignment');
const { generateEntryFormPdf } = require('../lib/entryFormPdf');

/**
 * True if a class is eligible for a dog of the given sex/DOB on the show date.
 */
function isClassEligible(cls, sex, dateOfBirth, showDate) {
  if (normaliseSex(cls.sex) !== normaliseSex(sex)) return false;
  const age = ageInMonths(dateOfBirth, showDate);
  const minOk = age >= cls.minAgeMonths;
  const maxOk = cls.maxAgeMonths == null || age < cls.maxAgeMonths;
  return minOk && maxOk;
}

/**
 * Submit a show entry (public, no login).
 *
 * Handles both branches of the flow:
 *  - Dog found in registry: registrationNumber resolves to a Dog, info confirmed.
 *  - Dog not found: manual entry with an uploaded pedigree (multer sets req.file),
 *    status stays PENDING and must be approved before it appears in the catalogue.
 *
 * Duplicate protection: warns if the reg number is already entered in this show,
 * unless duplicateOverride is set.
 */
exports.createEntry = async (req, res) => {
  const {
    showId,
    registrationNumber,
    dogName,
    sex,
    dateOfBirth,
    breed,
    colour,
    qualifications,
    microchip,
    tattoo,
    sireName,
    damName,
    breederName,
    ownerName,
    ownerKusaNo,
    exhibitorName,
    exhibitorEmail,
    exhibitorPhone,
    telNotForPublication,
    emailNotForPublication,
    classId,
    signatureName,
    declarationAgreed,
    paymentMethod,
    catalogueFull,
    duplicateOverride,
  } = req.body;

  if (!showId || !registrationNumber || !exhibitorName) {
    return res.status(400).json({
      message: 'Show, registration number and exhibitor name are required.',
    });
  }

  const show = await prisma.show.findUnique({
    where: { id: Number(showId) },
    include: { classes: true },
  });
  if (!show) return res.status(404).json({ message: 'Show not found.' });

  // Reject entries after the entry deadline has passed.
  if (show.entriesCloseAt && new Date() > new Date(show.entriesCloseAt)) {
    return res.status(403).json({
      message: 'Entries for this show have closed.',
      entriesClosed: true,
    });
  }

  const reg = String(registrationNumber).trim();

  // Duplicate protection for the same show.
  const existing = await prisma.showEntry.findFirst({
    where: { showId: Number(showId), registrationNumber: reg },
  });
  const override = duplicateOverride === true || duplicateOverride === 'true';
  if (existing && !override) {
    return res.status(409).json({
      duplicate: true,
      message: 'This dog has already been entered in this show.',
    });
  }

  // Try to resolve the dog in the central registry.
  const dog = await prisma.dog.findUnique({ where: { registrationNumber: reg } });
  const isManualEntry = !dog;

  // multer .fields() puts uploads on req.files keyed by field name.
  const files = req.files || {};
  const pedigreeFile = files.pedigree && files.pedigree[0];
  const entryFormFile = files.entryForm && files.entryForm[0];

  const pedigreeDocPath = pedigreeFile ? `/uploads/pedigrees/${pedigreeFile.filename}` : null;
  const entryFormPath = entryFormFile ? `/uploads/entry-forms/${entryFormFile.filename}` : null;

  // Manual entries require a pedigree document upload.
  if (isManualEntry && !pedigreeDocPath) {
    return res.status(400).json({
      message: 'A pedigree/registration document is required for manual entries.',
    });
  }

  const asBool = (v) => v === true || v === 'true';

  // The declaration must be agreed and signed (electronic signature) for ALL entries.
  const agreed = asBool(declarationAgreed);
  const signName = (signatureName || exhibitorName || '').trim();
  if (!agreed || !signName) {
    return res.status(400).json({
      message: 'You must read and agree to the declaration and sign by entering your full name.',
    });
  }

  // Source the descriptive fields from the registry where possible, else the form.
  const data = {
    showId: Number(showId),
    dogId: dog ? dog.id : null,
    registrationNumber: reg,
    dogName: dog ? dog.fullName : (dogName || '').trim(),
    sex: normaliseSex(dog ? dog.sex : sex) || (sex || '').trim(),
    dateOfBirth: dog && dog.birthDate ? dog.birthDate : new Date(dateOfBirth),
    breed: dog ? dog.breed : (breed || null),
    colour: dog ? dog.colour : (colour || null),
    qualifications: dog ? (dog.preQualifications || dog.postQualifications) : (qualifications || null),
    microchip: dog ? dog.microchip : (microchip || null),
    tattoo: dog ? dog.tattoo : (tattoo || null),
    sireName: dog ? dog.sireFullName : (sireName || null),
    damName: dog ? dog.damFullName : (damName || null),
    breederName: dog ? dog.breederName : (breederName || null),
    // The exhibitor/owner name from the form is authoritative for the catalogue.
    // The registry owner can be incorrect (sometimes it's actually the breeder),
    // so we use the confirmed exhibitor name, falling back to any manual owner field.
    ownerName: exhibitorName.trim() || (dog ? dog.ownerName : (ownerName || null)),
    ownerKusaNo: dog ? dog.ownerMemberNo : (ownerKusaNo || null),
    exhibitorName: exhibitorName.trim(),
    exhibitorEmail: exhibitorEmail || null,
    exhibitorPhone: exhibitorPhone || null,
    telNotForPublication: asBool(telNotForPublication),
    emailNotForPublication: asBool(emailNotForPublication),
    isManualEntry,
    pedigreeDocPath,
    entryFormPath, // optional uploaded fallback
    signatureName: signName,
    declarationAgreed: agreed,
    signedAt: new Date(),
    paymentMethod: paymentMethod || null,
    catalogueFull: asBool(catalogueFull),
    duplicateOverride: override,
    status: 'PENDING',
  };

  if (!data.dogName || !data.sex || !data.dateOfBirth || isNaN(new Date(data.dateOfBirth))) {
    return res.status(400).json({
      message: 'Dog name, sex and a valid date of birth are required.',
    });
  }

  // The exhibitor chooses the class. Validate the choice against the show's
  // configured classes for this dog's sex and age on the show date.
  if (!classId) {
    return res.status(400).json({ message: 'Please select a class for this dog.' });
  }
  const chosenClass = show.classes.find((c) => c.id === Number(classId));
  if (!chosenClass) {
    return res.status(400).json({ message: 'Selected class is not valid for this show.' });
  }
  if (!isClassEligible(chosenClass, data.sex, data.dateOfBirth, show.showDate)) {
    return res.status(400).json({
      message: 'The selected class is not applicable for this dog\'s age and sex.',
    });
  }
  data.classId = chosenClass.id;

  const entry = await prisma.showEntry.create({ data, include: { showClass: true } });

  // Generate the auto-populated, electronically signed official entry form (PDF).
  // Non-blocking: if generation fails, the entry still succeeds.
  let generatedFormPath = null;
  try {
    generatedFormPath = await generateEntryFormPdf(entry, show);
    await prisma.showEntry.update({ where: { id: entry.id }, data: { generatedFormPath } });
  } catch (err) {
    console.error('Entry form PDF generation failed:', err.message);
  }

  res.status(201).json({
    message: isManualEntry
      ? 'Entry submitted and is pending approval.'
      : 'Entry submitted successfully.',
    entry: { ...entry, generatedFormPath },
  });
};
