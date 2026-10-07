const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { UPLOADS_BASE } = require('./uploadsDir');

const GENERATED_DIR = path.join(UPLOADS_BASE, 'generated-forms');
fs.mkdirSync(GENERATED_DIR, { recursive: true });

// The KUSA declaration (points 1-13), condensed to the operative wording.
const DECLARATION = [
  'I am aware that only Members of the Kennel Union are entitled to enter and have dogs in their registered ownership compete in any Championship event licensed by the Kennel Union, save for Breed Classes at Specialist Club Championship Shows where entries are also open to non-members, and I am in full compliance at the time of entry and up to and including exhibition.',
  'The dog hereby entered is eligible to be exhibited at a KUSA-licensed Dog Show and its Registration Certificate is free from any endorsement restricting such exhibition.',
  'By entering, exhibiting or handling a dog at any Show held under a Kennel Union licence I agree to be bound by the KUSA Constitution in its entirety, including all Schedules thereto.',
  'I am aware that a dog that has suffered from or been exposed to any infectious or contagious disease within six (6) weeks prior to the Show, or that is suffering from such disease at the Show, may not attend, and contravention may render me liable to disciplinary action.',
  'The dog hereby entered is entered to be exhibited entirely at my own risk, and I shall ensure the dog is at all times properly confined or on a lead/leash unless authorised by a Judge in the ring.',
  'I accept full responsibility for the safety and behaviour of the dog for the duration of the Show and accept personal liability for any claim in respect of any damage or injury caused by the dog and/or my failure to adequately control it.',
  'I indemnify KUSA, its Officials and Officers, the show-holding Club and its Officers and employees against any and all claims arising from any damage, injury or harm caused by the dog hereby entered or any act or omission by me, my agents, handlers or representatives.',
  'I am fully responsible and liable for any damage, injury or harm caused by any minor child for whom I am legally responsible who accompanies me or handles the dog, for the duration of the Show.',
  'I am aware that persons on whom persona non grata status has been imposed by KUSA are not permitted to attend Shows.',
  'My appointed agent(s), handler(s), representative(s), guest(s), assistant(s) or any minor children for whom I am legally responsible are bound by this declaration, and I indemnify the aforesaid parties against all claims, damages, injury, death, liabilities, judgements, awards, costs, losses and expenses.',
  'I am familiar with Schedule 3 Regulation 44 regarding the cancellation of Shows and the refund or retention of Entry Fees, and I unreservedly accept and agree to it.',
  'This Entry Form and the information recorded on it is complete, accurate and true, and the dog hereby entered is entitled to free of mistatement or any false declaration.',
  'Should any information on this Entry Form be found to be inaccurate or fraudulent in any degree, I am aware that I may be liable for disciplinary action in terms of Schedule 1 Rule 4, resulting in any awards and/or prizes won by the dog hereby entered being withdrawn and/or cancelled.',
];

function line(doc, label, value, opts = {}) {
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(9).text(label, { continued: true });
  doc.font('Helvetica').fontSize(9).text(value ? ` ${value}` : ' —');
  if (opts.gap) doc.moveDown(opts.gap);
}

/**
 * Generate the auto-populated, electronically signed official entry form.
 * Returns the server-relative path (/uploads/generated-forms/xxx.pdf).
 */
function generateEntryFormPdf(entry, show) {
  return new Promise((resolve, reject) => {
    const filename = `entryform-${entry.id}-${Date.now()}.pdf`;
    const fullPath = path.join(GENERATED_DIR, filename);
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = fs.createWriteStream(fullPath);
    doc.pipe(stream);

    const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-ZA') : '');

    // Header
    doc.font('Helvetica-Bold').fontSize(14).text('OFFICIAL SHOW ENTRY FORM', { align: 'center' });
    doc.font('Helvetica').fontSize(8).text('Submitted electronically. One dog per entry form.', { align: 'center' });
    doc.moveDown(0.8);

    // Show block
    doc.font('Helvetica-Bold').fontSize(10).text(show.name);
    doc.font('Helvetica').fontSize(9)
      .text(`Show date: ${fmtDate(show.showDate)}${show.location ? `   Location: ${show.location}` : ''}`);
    doc.moveDown(0.6);

    // Dog details
    doc.font('Helvetica-Bold').fontSize(10).text('Dog details');
    doc.moveDown(0.2);
    line(doc, "Dog's Registered Name:", entry.dogName);
    line(doc, 'Registration Number:', entry.registrationNumber);
    line(doc, 'Sex:', entry.sex);
    line(doc, 'Date of Birth:', fmtDate(entry.dateOfBirth));
    line(doc, 'Breed:', entry.breed);
    line(doc, 'Colour:', entry.colour);
    line(doc, 'Qualifications:', entry.qualifications);
    line(doc, 'Microchip:', entry.microchip);
    line(doc, 'Sire:', entry.sireName);
    line(doc, 'Dam:', entry.damName);
    line(doc, 'Bred by:', entry.breederName);
    doc.moveDown(0.4);

    // Owner / exhibitor
    doc.font('Helvetica-Bold').fontSize(10).text('Registered Owner / Exhibitor');
    doc.moveDown(0.2);
    line(doc, 'Owner / Exhibitor:', entry.exhibitorName);
    line(doc, 'KUSA Member No:', entry.ownerKusaNo);
    line(doc, 'Tel:', entry.exhibitorPhone + (entry.telNotForPublication ? '  (not for publication)' : ''));
    line(doc, 'Email:', entry.exhibitorEmail + (entry.emailNotForPublication ? '  (not for publication)' : ''));
    doc.moveDown(0.4);

    // Entry / class / payment
    doc.font('Helvetica-Bold').fontSize(10).text('Entry');
    doc.moveDown(0.2);
    line(doc, 'Class entered:', entry.showClass ? `${entry.showClass.name} (${entry.sex})` : '');
    line(doc, 'Catalogue:', entry.catalogueFull ? 'Full catalogue ordered' : 'Not ordered');
    line(doc, 'Method of payment:', entry.paymentMethod);
    doc.moveDown(0.6);

    // Declaration
    doc.font('Helvetica-Bold').fontSize(10).text('Declaration by the Registered Owner / Authorised Agent');
    doc.font('Helvetica').fontSize(7.5).moveDown(0.2);
    DECLARATION.forEach((d, i) => {
      doc.text(`${i + 1}. ${d}`, { align: 'justify' });
      doc.moveDown(0.15);
    });
    doc.moveDown(0.5);

    // Signature block
    doc.font('Helvetica-Bold').fontSize(9)
      .text('Electronic signature', { underline: true });
    doc.font('Helvetica').fontSize(9).moveDown(0.2);
    doc.text(`Signed by inserting full name: ${entry.signatureName || entry.exhibitorName}`);
    doc.text(`Agreed to the declaration: ${entry.declarationAgreed ? 'Yes' : 'No'}`);
    doc.text(`Date & time: ${entry.signedAt ? new Date(entry.signedAt).toLocaleString('en-ZA') : ''}`);
    doc.moveDown(0.3);
    doc.font('Helvetica-Oblique').fontSize(7.5)
      .text('This form was completed and submitted electronically. By inserting their full name and confirming agreement, the signatory affirms they have read and understood the full contents of this Entry Form, as permitted by the KUSA entry declaration.');

    doc.end();
    stream.on('finish', () => resolve(`/uploads/generated-forms/${filename}`));
    stream.on('error', reject);
  });
}

module.exports = { generateEntryFormPdf, GENERATED_DIR };
