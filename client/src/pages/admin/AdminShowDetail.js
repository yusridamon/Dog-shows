import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const emptyClass = { name: '', sex: 'DOG', minAgeMonths: '', maxAgeMonths: '', ccEligible: true, sortOrder: 0, rules: '' };

export default function AdminShowDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState(null);
  const [details, setDetails] = useState(null);
  const [newClass, setNewClass] = useState(emptyClass);
  const [busy, setBusy] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id]);

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
      toast.error(err.response?.data?.message || 'Action failed.');
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

  if (!show || !details) return <div className="loading">Loading…</div>;

  const entryCount = show._count?.entries;
  const classCount = show._count?.classes ?? show.classes?.length;

  return (
    <div>
      <Link to="/admin/shows" className="btn ghost sm" style={{ marginBottom: '0.75rem', display: 'inline-block' }}>← Back to shows</Link>
      <div className="flex between" style={{ alignItems: 'flex-start' }}>
        <h1>{show.name}</h1>
        <div className="flex">
          <Link to={`/admin/shows/${id}/catalogue`} className="btn accent">Catalogue & judging</Link>
          <button className="btn danger" onClick={() => setShowDeleteModal(true)}>
            Delete show
          </button>
        </div>
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

      <div className="card">
        <h3>Judge critiques</h3>
        <p className="muted">
          Individual critiques are entered per dog and saved as drafts. At the end of the
          show, publish them all at once so they appear in the public catalogue. Grades are
          published live and are unaffected by this.
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
        <h3>Classes & age ranges</h3>
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
    </div>
  );
}
