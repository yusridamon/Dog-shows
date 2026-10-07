import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const empty = { name: '', location: '', showDate: '', entriesCloseAt: '', judgeName: '', stewardName: '', description: '', isPublished: false };

export default function AdminShows() {
  const [shows, setShows] = useState([]);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => api.get('/admin/shows').then((res) => setShows(res.data.shows));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/admin/shows', form);
      toast.success('Show created.');
      setForm(empty);
      setShowCreate(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create show.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex between" style={{ alignItems: 'center' }}>
        <h1>Shows</h1>
        <button className="btn" onClick={() => setShowCreate(true)}>+ New show</button>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => !busy && setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex between" style={{ alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Create a show</h3>
              <button className="btn ghost sm" onClick={() => !busy && setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={create} style={{ marginTop: '0.75rem' }}>
              <div className="grid cols-2">
                <div className="form-row">
                  <label>Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-row">
                  <label>Location</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Show date</label>
                  <input type="date" value={form.showDate} onChange={(e) => setForm({ ...form, showDate: e.target.value })} required />
                </div>
                <div className="form-row">
                  <label>Entries close at</label>
                  <input type="datetime-local" value={form.entriesCloseAt} onChange={(e) => setForm({ ...form, entriesCloseAt: e.target.value })} />
                  <span className="muted">When online entries close. Leave blank for no deadline.</span>
                </div>
                <div className="form-row">
                  <label>Judge</label>
                  <input value={form.judgeName} onChange={(e) => setForm({ ...form, judgeName: e.target.value })} placeholder="e.g. Mr Barron Africa" />
                </div>
                <div className="form-row">
                  <label>Steward</label>
                  <input value={form.stewardName} onChange={(e) => setForm({ ...form, stewardName: e.target.value })} />
                </div>
                <div className="form-row" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" style={{ width: 'auto' }} checked={form.isPublished}
                      onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
                    Published (visible to public)
                  </label>
                </div>
              </div>
              <div className="form-row">
                <label>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn ghost" disabled={busy} onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Create show'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Date</th><th>Entries close</th><th>Entries</th><th>Classes</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {shows.map((s) => {
              const closed = s.entriesCloseAt && new Date() > new Date(s.entriesCloseAt);
              return (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{format(new Date(s.showDate), 'PP')}</td>
                  <td>
                    {s.entriesCloseAt
                      ? <>{format(new Date(s.entriesCloseAt), 'PP p')}{closed && <span className="badge REJECTED" style={{ marginLeft: 6 }}>Closed</span>}</>
                      : <span className="muted">No deadline</span>}
                  </td>
                  <td>{s._count.entries}</td>
                  <td>{s._count.classes}</td>
                  <td>{s.isPublished ? 'Published' : 'Draft'}</td>
                  <td className="flex">
                    <Link to={`/admin/shows/${s.id}`} className="btn ghost sm">Manage</Link>
                    <Link to={`/admin/shows/${s.id}/catalogue`} className="btn sm">Catalogue</Link>
                  </td>
                </tr>
              );
            })}
            {shows.length === 0 && <tr><td colSpan="7" className="muted">No shows yet. Create one to get started.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
