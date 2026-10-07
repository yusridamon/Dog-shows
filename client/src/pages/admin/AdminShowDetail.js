import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../utils/api';

const emptyClass = { name: '', sex: 'DOG', minAgeMonths: '', maxAgeMonths: '', ccEligible: true, sortOrder: 0, rules: '' };

// Whole months between DOB and show date (dog's age on the show date).
function ageInMonths(dateOfBirth, showDate) {
  if (!dateOfBirth || !showDate) return null;
  const dob = new Date(dateOfBirth);
  const ref = new Date(showDate);
  if (isNaN(dob) || isNaN(ref)) return null;
  let m = (ref.getFullYear() - dob.getFullYear()) * 12 + (ref.getMonth() - dob.getMonth());
  if (ref.getDate() < dob.getDate()) m -= 1;
  return Math.max(0, m);
}

// Is a grade eligible for a dog of the given age (months on show date)?
function gradeEligible(grade, age) {
  if (age == null) return true; // can't compute — allow all
  const minOk = grade.minAgeMonths == null || age >= grade.minAgeMonths;
  const maxOk = grade.maxAgeMonths == null || age < grade.maxAgeMonths;
  return minOk && maxOk;
}

export default function AdminShowDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // The catalogue deep link (/admin/shows/:id/catalogue) opens the judging tab.
  const initialTab = location.pathname.endsWith('/catalogue') ? 'catalogue' : 'details';
  const [tab, setTab] = useState(initialTab);

  const [show, setShow] = useState(null);
  const [details, setDetails] = useState(null);
  const [newClass, setNewClass] = useState(emptyClass);
  const [busy, setBusy] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [missingCritiques, setMissingCritiques] = useState(null); // array | null
  const [pendingEntries, setPendingEntries] = useState(null); // array | null

  // Catalogue / judging state
  const [entries, setEntries] = useState([]);
  const [grades, setGrades] = useState([]);

  const load = () =>
    api.get(`/admin/shows/${id}`).then((res) => {
      setShow(res.data.show);
      setDetails({
        name: res.data.show.name,
        location: res.data.show.location || '',
        showDate: res.data.show.showDate.slice(0, 10),
        entriesCloseAt: res.data.show.entriesCloseAt ? res.data.show.entriesCloseAt.slice(0, 16) : '',
        judgeName: res.data.show.judgeName || '',
        stewardName: res.data.show.stewardName || '',
        description: res.data.show.description || '',
        isPublished: res.data.show.isPublished,
      });
    });

  const loadCatalogue = () =>
    api.get(`/admin/shows/${id}/catalogue`).then((res) => setEntries(res.data.entries));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id]);

  // Load the catalogue + grades once (and whenever the show id changes).
  useEffect(() => {
    loadCatalogue();
    api.get('/admin/grades').then((res) => setGrades(res.data.grades)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Keep the URL in sync so the judging tab is deep-linkable / refresh-safe.
  const selectTab = (next) => {
    setTab(next);
    const base = `/admin/shows/${id}`;
    navigate(next === 'catalogue' ? `${base}/catalogue` : base, { replace: true });
  };

  const saveShow = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put(`/admin/shows/${id}`, details);
      toast.success('Show updated.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally {
      setBusy(false);
    }
  };

  const releaseCatalogue = async (release) => {
    if (release && !window.confirm('Release the catalogue to the public? Every entry must be approved or rejected first.')) return;
    if (!release && !window.confirm('Hide the catalogue from the public again?')) return;
    try {
      const res = await api.post(`/admin/shows/${id}/release-catalogue`, { release });
      toast.success(res.data.message);
      load();
    } catch (err) {
      if (err.response?.data?.pendingEntries) {
        setPendingEntries(err.response.data.pendingEntries);
      } else {
        toast.error(err.response?.data?.message || 'Action failed.');
      }
    }
  };

  const addClass = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/admin/shows/${id}/classes`, newClass);
      toast.success('Class added.');
      setNewClass(emptyClass);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add class.');
    }
  };

  const deleteClass = async (classId) => {
    if (!window.confirm('Delete this class?')) return;
    await api.delete(`/admin/classes/${classId}`);
    load();
  };

  const publishCritiques = async (publish) => {
    const verb = publish ? 'publish' : 'unpublish';
    if (!window.confirm(`Are you sure you want to ${verb} ALL critiques for this show?`)) return;
    try {
      const res = await api.post(`/admin/shows/${id}/publish-critiques`, { publish });
      toast.success(res.data.message);
    } catch (err) {
      // If publishing was blocked by missing critiques, show them in a popup.
      if (err.response?.data?.missingCritiques) {
        setMissingCritiques(err.response.data.missingCritiques);
      } else {
        toast.error(err.response?.data?.message || 'Action failed.');
      }
    }
  };

  const deleteShow = async () => {
    setDeleting(true);
    try {
      await api.delete(`/admin/shows/${id}`);
      toast.success('Show deleted.');
      navigate('/admin/shows');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete show.');
      setDeleting(false);
    }
  };

  // Group catalogue entries Sex -> Class, ordered like the public catalogue.
  const grouped = useMemo(() => {
    const sexOrder = { DOG: 0, BITCH: 1 };
    const bySex = {};
    for (const e of entries) {
      const sex = e.sex || 'Other';
      bySex[sex] = bySex[sex] || {};
      const className = e.showClass ? e.showClass.name : 'Unassigned';
      const classKey = `${e.showClass ? e.showClass.sortOrder : 999}|${className}`;
      bySex[sex][classKey] = bySex[sex][classKey] || { className, entries: [] };
      bySex[sex][classKey].entries.push(e);
    }
    return Object.entries(bySex)
      .sort((a, b) => (sexOrder[a[0]] ?? 9) - (sexOrder[b[0]] ?? 9))
      .map(([sex, classes]) => ({
        sex,
        label: sex === 'DOG' ? 'Males' : sex === 'BITCH' ? 'Females' : sex,
        classes: Object.entries(classes)
          .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
          .map(([, v]) => v),
      }));
  }, [entries]);

  if (!show || !details) return <div className="loading">Loading…</div>;

  const entryCount = show._count?.entries;
  const classCount = show._count?.classes ?? show.classes?.length;
  const pendingCount = entries.filter((e) => e.status === 'PENDING').length;

  return (
    <div>
      <Link to="/admin/shows" className="btn ghost sm" style={{ marginBottom: '0.75rem', display: 'inline-block' }}>← Back to shows</Link>
      <div className="flex between" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{show.name}</h1>
          <div className="muted">
            {format(new Date(show.showDate), 'PPP')}{show.location ? ` · ${show.location}` : ''}
            {show.judgeName ? ` · Judge: ${show.judgeName}` : ''}
            {show.stewardName ? ` · Steward: ${show.stewardName}` : ''}
          </div>
        </div>
        <button className="btn danger" onClick={() => setShowDeleteModal(true)}>Delete show</button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'details' ? 'active' : ''}`} onClick={() => selectTab('details')}>
          Details &amp; classes
        </button>
        <button className={`tab ${tab === 'catalogue' ? 'active' : ''}`} onClick={() => selectTab('catalogue')}>
          Catalogue &amp; judging
          {pendingCount > 0 && <span className="badge PENDING" style={{ marginLeft: 8 }}>{pendingCount} pending</span>}
        </button>
      </div>

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: 'var(--danger)' }}>Delete this show?</h3>
            <p>
              You are about to permanently delete <strong>{show.name}</strong> and everything in it:
            </p>
            <ul>
              <li>All entries{entryCount != null ? ` (${entryCount})` : ''}, including gradings and judge critiques</li>
              <li>All configured classes{classCount != null ? ` (${classCount})` : ''}</li>
            </ul>
            <p className="error-text"><strong>This cannot be undone.</strong> The central dog registry is not affected.</p>
            <div className="flex" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn ghost" disabled={deleting} onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn danger" disabled={deleting} onClick={deleteShow}>
                {deleting ? 'Deleting…' : 'Yes, delete everything'}
              </button>
            </div>
          </div>
        </div>
      )}

      {missingCritiques && (
        <div className="modal-overlay" onClick={() => setMissingCritiques(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: 'var(--warn)' }}>Critiques not yet complete</h3>
            <p>These dogs still need a judge's critique before you can publish:</p>
            <div style={{ maxHeight: '45vh', overflowY: 'auto' }}>
              <ul>
                {missingCritiques.map((m, i) => (
                  <li key={i}>
                    <strong>{m.catalogueCode ? `${m.catalogueCode} · ` : ''}{m.dogName}</strong>
                    <span className="muted"> — {m.className}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn" onClick={() => setMissingCritiques(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {pendingEntries && (
        <div className="modal-overlay" onClick={() => setPendingEntries(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: 'var(--warn)' }}>Entries still pending</h3>
            <p>The catalogue cannot be released while these entries are pending. Approve or reject each one first:</p>
            <div style={{ maxHeight: '45vh', overflowY: 'auto' }}>
              <ul>
                {pendingEntries.map((p, i) => (
                  <li key={i}>
                    <strong>{p.dogName}</strong>
                    <span className="muted"> — {p.className} · {p.registrationNumber}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="muted">Resolve each pending entry in the Catalogue &amp; judging tab, then release.</p>
            <div className="flex" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn accent" onClick={() => { setPendingEntries(null); selectTab('catalogue'); }}>Go to catalogue</button>
              <button className="btn ghost" onClick={() => setPendingEntries(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'details' ? (
        <DetailsTab
          show={show}
          details={details}
          setDetails={setDetails}
          saveShow={saveShow}
          busy={busy}
          releaseCatalogue={releaseCatalogue}
          publishCritiques={publishCritiques}
          newClass={newClass}
          setNewClass={setNewClass}
          addClass={addClass}
          deleteClass={deleteClass}
        />
      ) : (
        <CatalogueTab
          showId={id}
          show={show}
          grouped={grouped}
          grades={grades}
          entries={entries}
          onChange={() => { loadCatalogue(); load(); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Details & classes tab
// ---------------------------------------------------------------------------
function DetailsTab({ show, details, setDetails, saveShow, busy, releaseCatalogue, publishCritiques, newClass, setNewClass, addClass, deleteClass }) {
  return (
    <>
      <div className="card">
        <h3>Public catalogue</h3>
        <p className="muted">
          The show is visible to exhibitors so they can enter. The public catalogue only
          appears once you release it, and it can only be released after every entry has been
          approved or rejected (nothing left pending).
        </p>
        <div className="flex" style={{ alignItems: 'center' }}>
          {show.catalogueReleased ? (
            <>
              <span className="badge APPROVED">Catalogue released</span>
              <button className="btn ghost" onClick={() => releaseCatalogue(false)}>Hide catalogue</button>
            </>
          ) : (
            <>
              <span className="badge PENDING">Catalogue not released</span>
              <button className="btn accent" onClick={() => releaseCatalogue(true)}>Release catalogue</button>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Judge critiques</h3>
        <p className="muted">
          Individual critiques are entered per dog in the Catalogue &amp; judging tab and saved as
          drafts. At the end of the show, publish them all at once so they appear in the public
          catalogue. Grades are published per class and are unaffected by this.
        </p>
        <div className="flex">
          <button className="btn accent" onClick={() => publishCritiques(true)}>Publish all critiques</button>
          <button className="btn ghost" onClick={() => publishCritiques(false)}>Unpublish all critiques</button>
        </div>
      </div>

      <div className="card">
        <h3>Show details</h3>
        <form onSubmit={saveShow}>
          <div className="grid cols-2">
            <div className="form-row">
              <label>Name</label>
              <input value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Location</label>
              <input value={details.location} onChange={(e) => setDetails({ ...details, location: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Show date</label>
              <input type="date" value={details.showDate} onChange={(e) => setDetails({ ...details, showDate: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Entries close at</label>
              <input type="datetime-local" value={details.entriesCloseAt} onChange={(e) => setDetails({ ...details, entriesCloseAt: e.target.value })} />
              <span className="muted">When online entries close. Leave blank for no deadline.</span>
            </div>
            <div className="form-row">
              <label>Judge</label>
              <input value={details.judgeName} onChange={(e) => setDetails({ ...details, judgeName: e.target.value })} placeholder="e.g. Mr Barron Africa" />
            </div>
            <div className="form-row">
              <label>Steward</label>
              <input value={details.stewardName} onChange={(e) => setDetails({ ...details, stewardName: e.target.value })} />
            </div>
            <div className="form-row" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={details.isPublished}
                  onChange={(e) => setDetails({ ...details, isPublished: e.target.checked })} />
                Published
              </label>
            </div>
          </div>
          <div className="form-row">
            <label>Description</label>
            <textarea value={details.description} onChange={(e) => setDetails({ ...details, description: e.target.value })} />
          </div>
          <button className="btn" disabled={busy}>Save</button>
        </form>
      </div>

      <div className="card">
        <h3>Classes &amp; age ranges</h3>
        <p className="muted">Age is evaluated in months on the show date. Leave "max age" blank for no upper bound.</p>
        <div className="table-wrap" style={{ marginBottom: '1rem' }}>
          <table>
            <thead>
              <tr><th>Name</th><th>Sex</th><th>Min age (mo)</th><th>Max age (mo)</th><th>CC/RCC</th><th>Rules</th><th /></tr>
            </thead>
            <tbody>
              {show.classes.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.sex}</td>
                  <td>{c.minAgeMonths}</td>
                  <td>{c.maxAgeMonths ?? '—'}</td>
                  <td>{c.ccEligible ? 'Yes' : 'No'}</td>
                  <td>{c.rules || '—'}</td>
                  <td><button className="btn danger sm" onClick={() => deleteClass(c.id)}>Delete</button></td>
                </tr>
              ))}
              {show.classes.length === 0 && <tr><td colSpan="7" className="muted">No classes configured yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <form onSubmit={addClass}>
          <div className="grid cols-3">
            <div className="form-row">
              <label>Class name</label>
              <input value={newClass.name} onChange={(e) => setNewClass({ ...newClass, name: e.target.value })} required />
            </div>
            <div className="form-row">
              <label>Sex</label>
              <select value={newClass.sex} onChange={(e) => setNewClass({ ...newClass, sex: e.target.value })}>
                <option value="DOG">Dog</option>
                <option value="BITCH">Bitch</option>
              </select>
            </div>
            <div className="form-row">
              <label>Sort order</label>
              <input type="number" value={newClass.sortOrder} onChange={(e) => setNewClass({ ...newClass, sortOrder: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Min age (months)</label>
              <input type="number" value={newClass.minAgeMonths} onChange={(e) => setNewClass({ ...newClass, minAgeMonths: e.target.value })} required />
            </div>
            <div className="form-row">
              <label>Max age (months)</label>
              <input type="number" value={newClass.maxAgeMonths} onChange={(e) => setNewClass({ ...newClass, maxAgeMonths: e.target.value })} />
            </div>
            <div className="form-row" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={newClass.ccEligible}
                  onChange={(e) => setNewClass({ ...newClass, ccEligible: e.target.checked })} />
                Eligible for CC/RCC
              </label>
            </div>
            <div className="form-row">
              <label>Rules (optional)</label>
              <input value={newClass.rules} onChange={(e) => setNewClass({ ...newClass, rules: e.target.value })} />
            </div>
          </div>
          <button className="btn">Add class</button>
        </form>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Catalogue & judging tab
// ---------------------------------------------------------------------------
function CatalogueTab({ showId, show, grouped, grades, entries, onChange }) {
  return (
    <>
      <p className="muted">
        This catalogue shows every entry (approved and pending). Approve pending entries, then
        record the grade, placing and judge critique per dog. Release grades per class when the
        class is fully judged; publish critiques from the Details tab at the end of the show.
      </p>

      {entries.length === 0 && <p className="muted">No entries yet for this show.</p>}

      {grouped.map((sexGroup) => (
        <div key={sexGroup.sex}>
          <h2 className="section-title">{sexGroup.label}</h2>
          {sexGroup.classes.map((cls) => (
            <ClassBlock
              key={cls.className}
              showId={showId}
              label={`${sexGroup.label}: ${cls.className}`}
              entries={cls.entries}
              grades={grades}
              showDate={show.showDate}
              onChange={onChange}
            />
          ))}
        </div>
      ))}
    </>
  );
}

function ClassBlock({ showId, label, entries, grades, showDate, onChange }) {
  // Only approved/completed entries count toward release readiness.
  const inRing = entries.filter((e) => e.status === 'APPROVED' || e.status === 'COMPLETED');
  const graded = inRing.filter((e) => e.gradeId && e.placing != null);
  const allDone = inRing.length > 0 && graded.length === inRing.length;
  const released = inRing.length > 0 && inRing.every((e) => e.resultsReleased);
  // Need the class id + sex for the release call (from any entry in the group).
  const sample = inRing[0] || entries[0];
  const classId = sample?.classId;
  const sex = sample?.sex;

  const release = async () => {
    try {
      const res = await api.post(`/admin/shows/${showId}/release-class`, { classId, sex });
      toast.success(res.data.message);
      onChange();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not release.');
    }
  };
  const unrelease = async () => {
    try {
      const res = await api.post(`/admin/shows/${showId}/unrelease-class`, { classId, sex });
      toast.success(res.data.message);
      onChange();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not hide results.');
    }
  };

  return (
    <div>
      <div className="flex between" style={{ alignItems: 'center' }}>
        <h3 style={{ margin: '1rem 0 0.5rem' }}>{label}</h3>
        <div className="flex">
          {released ? (
            <>
              <span className="badge APPROVED">Results released</span>
              <button className="btn ghost sm" onClick={unrelease}>Hide results</button>
            </>
          ) : (
            <>
              <span className="muted">{graded.length}/{inRing.length} graded &amp; placed</span>
              <button className="btn accent sm" disabled={!allDone || !classId} onClick={release}>
                Release grades &amp; placings
              </button>
            </>
          )}
        </div>
      </div>
      {entries.map((e) => (
        <AdminCatalogueRow key={e.id} entry={e} grades={grades} showDate={showDate} onChange={onChange} />
      ))}
    </div>
  );
}

function AdminCatalogueRow({ entry, grades, showDate, onChange }) {
  const [gradeId, setGradeId] = useState(entry.gradeId ? String(entry.gradeId) : '');
  const [placing, setPlacing] = useState(entry.placing != null ? String(entry.placing) : '');
  const [judgeName, setJudgeName] = useState(entry.critique?.judgeName || '');
  const [critiqueText, setCritiqueText] = useState(entry.critique?.text || '');
  const [saving, setSaving] = useState(false);

  const act = async (fn, ok) => {
    setSaving(true);
    try {
      await fn();
      toast.success(ok);
      onChange();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    } finally {
      setSaving(false);
    }
  };

  const approved = entry.status === 'APPROVED' || entry.status === 'COMPLETED';

  return (
    <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
      <div className="flex between" style={{ alignItems: 'flex-start' }}>
        <div>
          <span className="cat-no" style={{ marginRight: 8 }}>{entry.catalogueCode || '—'}</span>
          <strong>{entry.qualifications ? `${entry.qualifications} ` : ''}{entry.dogName}</strong>
          <span className={`badge ${entry.status}`} style={{ marginLeft: 8 }}>{entry.status}</span>
        </div>
        <Link to={`/admin/entries/${entry.id}`} className="btn ghost sm">Open entry</Link>
      </div>
      <div className="muted" style={{ margin: '0.25rem 0' }}>
        {entry.registrationNumber} · {entry.sex} · DOB {entry.dateOfBirth ? format(new Date(entry.dateOfBirth), 'yyyy/MM/dd') : '—'} · Owner {entry.ownerName || '—'}
      </div>

      <div className="flex" style={{ marginBottom: '0.5rem' }}>
        {(entry.generatedFormPath || entry.entryFormPath) &&
          <a href={fileUrl(entry.generatedFormPath || entry.entryFormPath)} target="_blank" rel="noreferrer" className="btn ghost sm">Entry form</a>}
        {entry.pedigreeDocPath && <a href={fileUrl(entry.pedigreeDocPath)} target="_blank" rel="noreferrer" className="btn ghost sm">Pedigree</a>}
        {!approved && (
          <button className="btn success sm" disabled={saving}
            onClick={() => act(() => api.post(`/admin/entries/${entry.id}/approve`), 'Approved.')}>
            Approve
          </button>
        )}
      </div>

      {approved ? (
        <div className="grid cols-2">
          <div className="form-row">
            <label>Grade &amp; placing {entry.resultsReleased && <span className="badge APPROVED">Released</span>}</label>
            <div className="flex">
              <select value={gradeId} onChange={(e) => setGradeId(e.target.value)} style={{ maxWidth: 150 }}>
                <option value="">No grade</option>
                {grades
                  .filter((g) => gradeEligible(g, ageInMonths(entry.dateOfBirth, showDate)))
                  .map((g) => <option key={g.id} value={g.id}>{g.name} — {g.englishDescription}</option>)}
              </select>
              <input type="number" min="1" placeholder="Placing" value={placing}
                onChange={(e) => setPlacing(e.target.value)} style={{ maxWidth: 90 }} />
              <button className="btn sm" disabled={saving}
                onClick={() => act(() => api.post(`/admin/entries/${entry.id}/grade`, { gradeId: gradeId || null, placing: placing || null }), 'Grade & placing saved.')}>
                Save
              </button>
            </div>
          </div>
          <div className="form-row">
            <label>Judge (for critique)</label>
            <input value={judgeName} onChange={(e) => setJudgeName(e.target.value)} placeholder={entry.show?.judgeName || 'Judge name'} />
          </div>
          <div className="form-row" style={{ gridColumn: '1 / -1' }}>
            <label>Judge's critique {entry.critique && (entry.critique.isPublished ? <span className="badge APPROVED">Published</span> : <span className="badge PENDING">Draft</span>)}</label>
            <textarea value={critiqueText} onChange={(e) => setCritiqueText(e.target.value)} />
            <button className="btn sm" style={{ marginTop: 6 }} disabled={saving}
              onClick={() => {
                if (!judgeName || !critiqueText) return toast.error('Judge name and critique text are required.');
                return act(() => api.put(`/admin/entries/${entry.id}/critique`, { judgeName, text: critiqueText }), 'Critique saved as draft.');
              }}>
              Save critique
            </button>
          </div>
        </div>
      ) : (
        <p className="muted">Approve this entry to assign a catalogue number and record grading/critique.</p>
      )}
    </div>
  );
}
