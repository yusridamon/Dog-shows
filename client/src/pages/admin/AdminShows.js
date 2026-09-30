import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const empty = { name: '', location: '', showDate: '', description: '', isPublished: false };

export default function AdminShows() {
  const [shows, setShows] = useState([]);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/admin/shows').then((res) => setShows(res.data.shows));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/admin/shows', form);
      toast.success('Show created.');
      setForm(empty);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create show.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1>Shows</h1>

      <div className="card">
        <h3>Create a show</h3>
        <form onSubmit={create}>
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
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Create show'}</button>
        </form>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Date</th><th>Entries</th><th>Classes</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {shows.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{format(new Date(s.showDate), 'PP')}</td>
                <td>{s._count.entries}</td>
                <td>{s._count.classes}</td>
                <td>{s.isPublished ? 'Published' : 'Draft'}</td>
                <td><Link to={`/admin/shows/${s.id}`} className="btn ghost sm">Manage</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
