import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const emptyManual = {
  dogName: '', sex: 'DOG', dateOfBirth: '', breed: '', colour: '',
  qualifications: '', microchip: '', tattoo: '',
  sireName: '', damName: '', breederName: '', ownerName: '', ownerKusaNo: '',
};

// Whole months between DOB and the show date (age of dog on show date).
function ageInMonths(dateOfBirth, showDate) {
  if (!dateOfBirth || !showDate) return null;
  const dob = new Date(dateOfBirth);
  const ref = new Date(showDate);
  if (isNaN(dob) || isNaN(ref)) return null;
  let months = (ref.getFullYear() - dob.getFullYear()) * 12 + (ref.getMonth() - dob.getMonth());
  if (ref.getDate() < dob.getDate()) months -= 1;
  return Math.max(0, months);
}

function normaliseSex(sex) {
  const s = String(sex || '').trim().toUpperCase();
  if (['DOG', 'MALE', 'M'].includes(s)) return 'DOG';
  if (['BITCH', 'FEMALE', 'F'].includes(s)) return 'BITCH';
  return s;
}

// Is a configured class eligible for a dog of this sex/age on the show date?
function classEligible(cls, sex, dateOfBirth, showDate) {
  if (normaliseSex(cls.sex) !== normaliseSex(sex)) return false;
  const age = ageInMonths(dateOfBirth, showDate);
  if (age == null) return false;
  const minOk = age >= cls.minAgeMonths;
  const maxOk = cls.maxAgeMonths == null || age < cls.maxAgeMonths;
  return minOk && maxOk;
}

export default function EnterDogPage() {
  const [shows, setShows] = useState([]);
  const [showId, setShowId] = useState('');
  const [showClasses, setShowClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [reg, setReg] = useState('');
  const [step, setStep] = useState('lookup'); // lookup | found | manual | done
  const [dog, setDog] = useState(null);
  const [manual, setManual] = useState(emptyManual);
  const [pedigree, setPedigree] = useState(null);
  const [declaration, setDeclaration] = useState({
    signatureName: '', declarationAgreed: false, paymentMethod: 'ELECTRONIC TRANSFER', catalogueFull: false,
  });
  const [exhibitor, setExhibitor] = useState({
    exhibitorName: '', exhibitorEmail: '', exhibitorPhone: '',
  });
  const [busy, setBusy] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const preselect = searchParams.get('show');
    api.get('/shows').then((res) => {
      setShows(res.data.shows);
      if (res.data.shows.length) {
        const match = preselect && res.data.shows.find((s) => String(s.id) === String(preselect));
        setShowId(String(match ? match.id : res.data.shows[0].id));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the selected show's configured classes (with age ranges) for the dropdown.
  useEffect(() => {
    if (!showId) { setShowClasses([]); return; }
    let cancelled = false;
    setClassId('');
    // Cache-bust so we never get a stale (pre-configuration) cached response.
    api.get(`/shows/${showId}`, { params: { _: Date.now() } })
      .then((res) => {
        if (cancelled) return;
        const classes = res.data?.show?.classes || [];
        setShowClasses(classes);
        if (classes.length === 0) {
          console.warn('No classes returned for show', showId, res.data);
        }
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to load show classes:', err);
      });
    return () => { cancelled = true; };
  }, [showId]);

  // The show date and the dog's sex/DOB drive class eligibility.
  const selectedShow = shows.find((s) => String(s.id) === String(showId));
  const currentSex = step === 'manual' ? manual.sex : (dog ? dog.sex : null);
  const currentDob = step === 'manual' ? manual.dateOfBirth : (dog ? dog.birthDate : null);

  // If the currently selected class becomes ineligible after sex/DOB changes, clear it.
  useEffect(() => {
    if (!classId) return;
    const cls = showClasses.find((c) => String(c.id) === String(classId));
    if (cls && selectedShow && !classEligible(cls, currentSex, currentDob, selectedShow.showDate)) {
      setClassId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSex, currentDob, showClasses]);

  const doLookup = async (e) => {
    e.preventDefault();
    if (!showId) return toast.error('Please select a show.');
    if (!reg.trim()) return toast.error('Enter a registration number.');
    setBusy(true);
    setDuplicate(false);
    try {
      const res = await api.get('/dogs/lookup', { params: { registrationNumber: reg.trim() } });
      if (res.data.found) {
        setDog(res.data.dog);
        // Prefill the exhibitor/owner name with the registry owner as a starting
        // point; the exhibitor can correct it (the registry sometimes lists the breeder).
        setExhibitor((prev) => ({
          ...prev,
          exhibitorName: prev.exhibitorName || res.data.dog.ownerName || '',
        }));
        setStep('found');
      } else {
        toast('Dog not found in our database.', { icon: 'ℹ️' });
        setDog(null);
        setManual(emptyManual);
        setStep('manual');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lookup failed.');
    } finally {
      setBusy(false);
    }
  };

  const buildFormData = (override = false) => {
    const fd = new FormData();
    fd.append('showId', showId);
    fd.append('registrationNumber', reg.trim());
    fd.append('exhibitorName', exhibitor.exhibitorName);
    fd.append('exhibitorEmail', exhibitor.exhibitorEmail);
    fd.append('exhibitorPhone', exhibitor.exhibitorPhone);
    fd.append('classId', classId);
    fd.append('signatureName', declaration.signatureName);
    fd.append('declarationAgreed', String(declaration.declarationAgreed));
    fd.append('paymentMethod', declaration.paymentMethod);
    fd.append('catalogueFull', String(declaration.catalogueFull));
    if (override) fd.append('duplicateOverride', 'true');

    if (step === 'manual') {
      fd.append('dogName', manual.dogName);
      fd.append('sex', manual.sex);
      fd.append('dateOfBirth', manual.dateOfBirth);
      fd.append('breed', manual.breed);
      fd.append('colour', manual.colour);
      fd.append('qualifications', manual.qualifications);
      fd.append('microchip', manual.microchip);
      fd.append('tattoo', manual.tattoo);
      fd.append('sireName', manual.sireName);
      fd.append('damName', manual.damName);
      fd.append('breederName', manual.breederName);
      fd.append('ownerName', manual.ownerName);
      fd.append('ownerKusaNo', manual.ownerKusaNo);
      if (pedigree) fd.append('pedigree', pedigree);
    }
    return fd;
  };

  const submit = async (override = false) => {
    if (!exhibitor.exhibitorName.trim()) return toast.error('Enter the exhibitor name.');
    if (step === 'manual') {
      if (!manual.dogName || !manual.dateOfBirth) return toast.error('Dog name and date of birth are required.');
      if (!pedigree) return toast.error('Please upload a pedigree document.');
    }
    if (!classId) return toast.error('Please select a class to enter.');
    if (!declaration.declarationAgreed) return toast.error('Please read and agree to the declaration.');
    if (!declaration.signatureName.trim()) return toast.error('Please sign by entering your full name.');
    setBusy(true);
    try {
      await api.post('/entries', buildFormData(override), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStep('done');
      toast.success('Entry submitted.');
    } catch (err) {
      if (err.response?.status === 409 && err.response.data?.duplicate) {
        setDuplicate(true);
      } else {
        toast.error(err.response?.data?.message || 'Submission failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setReg(''); setDog(null); setManual(emptyManual); setPedigree(null); setClassId('');
    setDeclaration({ signatureName: '', declarationAgreed: false, paymentMethod: 'ELECTRONIC TRANSFER', catalogueFull: false });
    setExhibitor({ exhibitorName: '', exhibitorEmail: '', exhibitorPhone: '' });
    setStep('lookup'); setDuplicate(false);
  };

  if (step === 'done') {
    return (
      <div className="card" style={{ maxWidth: 600 }}>
        <h1>Entry submitted</h1>
        <p>Thank you. Your entry has been received.</p>
        <p className="muted">
          {dog
            ? 'Your dog was found in our registry and your entry is being processed.'
            : 'Your manual entry is pending approval by a show official. Once approved it will appear in the catalogue.'}
        </p>
        <button className="btn" onClick={reset}>Enter another dog</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1>Enter Dog</h1>

      <div className="card">
        <div className="form-row">
          <label>Show</label>
          <select value={showId} onChange={(e) => setShowId(e.target.value)}>
            {shows.length === 0 && <option value="">No shows available</option>}
            {shows.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {format(new Date(s.showDate), 'PP')}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={doLookup}>
          <div className="form-row">
            <label>Registration number</label>
            <div className="flex">
              <input
                value={reg}
                onChange={(e) => setReg(e.target.value)}
                placeholder="e.g. ZA037347B14"
                disabled={step !== 'lookup'}
              />
              {step === 'lookup' && (
                <button className="btn" disabled={busy}>{busy ? 'Searching…' : 'Search'}</button>
              )}
            </div>
          </div>
        </form>
        {step !== 'lookup' && (
          <button className="btn ghost sm" onClick={reset}>Start over</button>
        )}
      </div>

      {step === 'found' && dog && (
        <div className="card">
          <h3>Dog found — please confirm</h3>
          <dl>
            <div><strong>Name:</strong> {dog.fullName}</div>
            <div><strong>Registration:</strong> {dog.registrationNumber}</div>
            <div><strong>Sex:</strong> {dog.sex}</div>
            <div><strong>Breed:</strong> {dog.breed || '—'}</div>
            <div><strong>Date of birth:</strong> {dog.birthDate ? format(new Date(dog.birthDate), 'PP') : '—'}</div>
            <div><strong>Sire:</strong> {dog.sireFullName || '—'}</div>
            <div><strong>Dam:</strong> {dog.damFullName || '—'}</div>
            <div><strong>Owner on record:</strong> {dog.ownerName || '—'} <span className="muted">(confirm/correct below)</span></div>
          </dl>
          <ClassSelect
            classes={showClasses} value={classId} onChange={setClassId}
            sex={dog.sex} dateOfBirth={dog.birthDate} showDate={selectedShow?.showDate}
          />
          <DeclarationStep declaration={declaration} setDeclaration={setDeclaration} />
          <ExhibitorFields exhibitor={exhibitor} setExhibitor={setExhibitor} />
          <DuplicateNotice duplicate={duplicate} busy={busy} onOverride={() => submit(true)} />
          {!duplicate && (
            <button className="btn accent" disabled={busy} onClick={() => submit(false)}>
              {busy ? 'Submitting…' : 'Confirm & submit entry'}
            </button>
          )}
        </div>
      )}

      {step === 'manual' && (
        <div className="card">
          <h3>Manual entry</h3>
          <p className="muted">Dog not found in our database. Enter the details and upload a pedigree document.</p>
          <div className="grid cols-2">
            <div className="form-row">
              <label>Registered name</label>
              <input value={manual.dogName} onChange={(e) => setManual({ ...manual, dogName: e.target.value })} required />
            </div>
            <div className="form-row">
              <label>Sex</label>
              <select value={manual.sex} onChange={(e) => setManual({ ...manual, sex: e.target.value })}>
                <option value="DOG">Dog (male)</option>
                <option value="BITCH">Bitch (female)</option>
              </select>
            </div>
            <div className="form-row">
              <label>Date of birth</label>
              <input type="date" value={manual.dateOfBirth} onChange={(e) => setManual({ ...manual, dateOfBirth: e.target.value })} required />
            </div>
            <div className="form-row">
              <label>Breed</label>
              <input value={manual.breed} onChange={(e) => setManual({ ...manual, breed: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Colour</label>
              <input value={manual.colour} onChange={(e) => setManual({ ...manual, colour: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Qualifications / titles</label>
              <input value={manual.qualifications} onChange={(e) => setManual({ ...manual, qualifications: e.target.value })} placeholder="e.g. CH" />
            </div>
            <div className="form-row">
              <label>Microchip</label>
              <input value={manual.microchip} onChange={(e) => setManual({ ...manual, microchip: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Tattoo</label>
              <input value={manual.tattoo} onChange={(e) => setManual({ ...manual, tattoo: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Sire</label>
              <input value={manual.sireName} onChange={(e) => setManual({ ...manual, sireName: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Dam</label>
              <input value={manual.damName} onChange={(e) => setManual({ ...manual, damName: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Bred by (breeder)</label>
              <input value={manual.breederName} onChange={(e) => setManual({ ...manual, breederName: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <label>KUSA member no.</label>
            <input value={manual.ownerKusaNo} onChange={(e) => setManual({ ...manual, ownerKusaNo: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Pedigree / registration document (PDF, JPG, JPEG, PNG)</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setPedigree(e.target.files[0] || null)} />
          </div>

          <ClassSelect
            classes={showClasses} value={classId} onChange={setClassId}
            sex={manual.sex} dateOfBirth={manual.dateOfBirth} showDate={selectedShow?.showDate}
          />
          <DeclarationStep declaration={declaration} setDeclaration={setDeclaration} />
          <ExhibitorFields exhibitor={exhibitor} setExhibitor={setExhibitor} />
          <DuplicateNotice duplicate={duplicate} busy={busy} onOverride={() => submit(true)} />
          {!duplicate && (
            <button className="btn accent" disabled={busy} onClick={() => submit(false)}>
              {busy ? 'Submitting…' : 'Submit for approval'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ClassSelect({ classes, value, onChange, sex, dateOfBirth, showDate }) {
  const dogSex = normaliseSex(sex);
  const age = ageInMonths(dateOfBirth, showDate);

  // Only classes for this dog's sex are relevant; sort by age band (youngest first).
  const sexClasses = classes
    .filter((c) => normaliseSex(c.sex) === dogSex)
    .sort((a, b) => a.minAgeMonths - b.minAgeMonths || a.sortOrder - b.sortOrder);

  const rangeLabel = (c) => {
    const min = c.minAgeMonths;
    const max = c.maxAgeMonths;
    if (max == null) return `${min}+ months`;
    return `${min}–${max} months`;
  };

  const noInfo = !dogSex || age == null;

  return (
    <div className="form-row">
      <label>Class to enter</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={noInfo}>
        <option value="">{noInfo ? 'Enter sex and date of birth first' : 'Select a class…'}</option>
        {sexClasses.map((c) => {
          const eligible = classEligible(c, sex, dateOfBirth, showDate);
          return (
            <option key={c.id} value={c.id} disabled={!eligible}>
              {c.name} ({rangeLabel(c)}){eligible ? '' : ' — not eligible'}
            </option>
          );
        })}
      </select>
      {age != null && (
        <span className="muted">
          Dog is {age} month{age === 1 ? '' : 's'} old on the show date. Ineligible classes are greyed out.
        </span>
      )}
      {!noInfo && sexClasses.length === 0 && (
        <span className="error-text">
          No classes have been configured for this show yet. Please contact the show organiser.
        </span>
      )}
    </div>
  );
}

const DECLARATION_POINTS = [
  'I am aware that only Members of the Kennel Union are entitled to enter and have dogs in their registered ownership compete in any Championship event licensed by the Kennel Union (save for Breed Classes at Specialist Club Championship Shows), and I am in full compliance at the time of entry and up to exhibition.',
  'The dog hereby entered is eligible to be exhibited at a KUSA-licensed Dog Show and its Registration Certificate is free from any endorsement restricting such exhibition.',
  'By entering, exhibiting or handling a dog at any Show held under a Kennel Union licence I agree to be bound by the KUSA Constitution in its entirety, including all Schedules.',
  'I am aware a dog that has suffered from or been exposed to any infectious or contagious disease within six weeks prior to the Show may not attend, and contravention may render me liable to disciplinary action.',
  'The dog is entered to be exhibited entirely at my own risk, and I shall ensure it is at all times properly confined or on a lead/leash unless authorised by a Judge in the ring.',
  'I accept full responsibility for the safety and behaviour of the dog and accept personal liability for any claim in respect of damage or injury caused by the dog and/or my failure to control it.',
  'I indemnify KUSA, its Officials and Officers, the show-holding Club and its Officers and employees against all claims arising from any damage, injury or harm caused by the dog or any act or omission by me or my agents.',
  'I am responsible and liable for any damage, injury or harm caused by any minor child for whom I am legally responsible who accompanies me or handles the dog.',
  'I am aware that persons on whom persona non grata status has been imposed by KUSA are not permitted to attend Shows.',
  'My appointed agents, handlers, representatives, guests and assistants are bound by this declaration, and I indemnify the aforesaid parties against all claims, damages and losses.',
  'I am familiar with Schedule 3 Regulation 44 regarding cancellation of Shows and the refund or retention of Entry Fees, and I unreservedly accept it.',
  'This Entry Form and the information on it is complete, accurate and true, and free of misstatement or false declaration.',
  'Should any information be found inaccurate or fraudulent, I am aware I may be liable for disciplinary action in terms of Schedule 1 Rule 4, with awards withdrawn and/or cancelled.',
];

function DeclarationStep({ declaration, setDeclaration }) {
  const set = (k, v) => setDeclaration({ ...declaration, [k]: v });
  return (
    <div className="card" style={{ background: '#fbf8f1', borderColor: '#e7dfcf' }}>
      <h4 style={{ marginTop: 0 }}>Official entry form &amp; declaration</h4>
      <p className="muted" style={{ marginTop: 0 }}>
        We complete the official entry form from the details above and generate a signed copy for you,
        so there is nothing to print or scan. You can view the blank official form below if you wish.
      </p>
      <p style={{ margin: '0 0 0.75rem' }}>
        <a href={`${process.env.PUBLIC_URL}/forms/official-entry-form.pdf`} target="_blank" rel="noreferrer" className="btn ghost sm">
          View blank official form
        </a>
      </p>

      <div className="grid cols-2">
        <div className="form-row">
          <label>Method of payment</label>
          <select value={declaration.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
            <option>ELECTRONIC TRANSFER</option>
            <option>DIRECT DEPOSIT</option>
            <option>CASH</option>
            <option>OTHER</option>
          </select>
        </div>
        <div className="form-row" style={{ display: 'flex', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={declaration.catalogueFull}
              onChange={(e) => set('catalogueFull', e.target.checked)} />
            Order a full catalogue
          </label>
        </div>
      </div>

      <label>Declaration by the Registered Owner / Authorised Agent</label>
      <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: '0.6rem 0.8rem', background: '#fff', fontSize: '0.8rem', margin: '0.25rem 0 0.75rem' }}>
        <ol style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {DECLARATION_POINTS.map((p, i) => <li key={i} style={{ marginBottom: 6 }}>{p}</li>)}
        </ol>
      </div>

      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontWeight: 400, marginBottom: '0.75rem' }}>
        <input type="checkbox" style={{ width: 'auto', marginTop: 3 }} checked={declaration.declarationAgreed}
          onChange={(e) => set('declarationAgreed', e.target.checked)} />
        I have read and understood the full declaration above and agree to it.
      </label>

      <div className="form-row">
        <label>Signature — type your full name</label>
        <input value={declaration.signatureName} onChange={(e) => set('signatureName', e.target.value)}
          placeholder="Full name and surname" />
        <span className="muted">By typing your full name you are signing this entry electronically.</span>
      </div>
    </div>
  );
}

function ExhibitorFields({ exhibitor, setExhibitor }) {
  return (
    <>
      <h4>Exhibitor details</h4>
      <div className="grid cols-2">
        <div className="form-row">
          <label>Exhibitor / Owner name</label>
          <input value={exhibitor.exhibitorName} onChange={(e) => setExhibitor({ ...exhibitor, exhibitorName: e.target.value })} required />
          <span className="muted">This is the owner name shown in the catalogue. Please correct it if our records are wrong.</span>
        </div>
        <div className="form-row">
          <label>Email</label>
          <input type="email" value={exhibitor.exhibitorEmail} onChange={(e) => setExhibitor({ ...exhibitor, exhibitorEmail: e.target.value })} />
        </div>
      </div>
      <div className="form-row">
        <label>Phone</label>
        <input value={exhibitor.exhibitorPhone} onChange={(e) => setExhibitor({ ...exhibitor, exhibitorPhone: e.target.value })} />
      </div>
    </>
  );
}

function DuplicateNotice({ duplicate, busy, onOverride }) {
  if (!duplicate) return null;
  return (
    <div className="card" style={{ background: '#fef3c7', borderColor: '#fcd34d' }}>
      <p style={{ margin: 0 }}><strong>This dog has already been entered in this show.</strong></p>
      <p className="muted">If this is intentional, you can submit anyway.</p>
      <button className="btn" disabled={busy} onClick={onOverride}>Submit anyway</button>
    </div>
  );
}

