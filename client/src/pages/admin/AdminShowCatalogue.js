import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../utils/api';

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

export default function AdminShowCatalogue() {
  const { id } = useParams();
  const [show, setShow] = useState(null);
  const [entries, setEntries] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api.get(`/admin/shows/${id}/catalogue`).then((res) => {
      setShow(res.data.show);
      setEntries(res.data.entries);
    });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      load(),
      api.get('/admin/grades').then((res) => setGrades(res.data.grades)),
    ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Group Sex -> Class, ordered like the public catalogue.
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

  if (loading) return <div className="loading">Loading catalogue…</div>;
  if (!show) return <div className="loading">Show not found.</div>;

  return (
    <div>
      <div className="flex between">
        <div>
          <h1 style={{ marginBottom: 4 }}>{show.name}</h1>
          <div className="muted">
            {format(new Date(show.showDate), 'PPP')}{show.location ? ` · ${show.location}` : ''}
            {show.judgeName ? ` · Judge: ${show.judgeName}` : ''}
            {show.stewardName ? ` · Steward: ${show.stewardName}` : ''}
          </div>
        </div>
        <Link to={`/admin/shows/${id}`} className="btn ghost">Back to show</Link>
      </div>

      <p className="muted">
        This catalogue shows every entry (approved and pending). Approve pending entries, then
        record the grade and judge critique per dog. Grades show live; critiques publish via the
        show page.
      </p>

      {entries.length === 0 && <p className="muted">No entries yet for this show.</p>}

      {grouped.map((sexGroup) => (
        <div key={sexGroup.sex}>
          <h2 className="section-title">{sexGroup.label}</h2>
          {sexGroup.classes.map((cls) => (
            <ClassBlock
              key={cls.className}
              showId={id}
              label={`${sexGroup.label}: ${cls.className}`}
              entries={cls.entries}
              grades={grades}
              showDate={show.showDate}
              onChange={load}
            />
          ))}
        </div>
      ))}
    </div>
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
        {entry.entryFormPath && <a href={fileUrl(entry.entryFormPath)} target="_blank" rel="noreferrer" className="btn ghost sm">Entry form</a>}
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
