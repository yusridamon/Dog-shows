import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'COMPLETED'];

export default function AdminEntries() {
  const [entries, setEntries] = useState([]);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    showId: '', status: '', registrationNumber: '', dogName: '',
    owner: '', exhibitor: '', catalogueNumber: '', sex: '', breed: '',
  });

  useEffect(() => { api.get('/admin/shows').then((res) => setShows(res.data.shows)); }, []);

  const load = () => {
    setLoading(true);
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    api.get('/admin/entries', { params })
      .then((res) => setEntries(res.data.entries))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  return (
    <div>
      <h1>Entries</h1>

      <div className="card">
        <div className="grid cols-3">
          <div className="form-row">
            <label>Show</label>
            <select value={filters.showId} onChange={set('showId')}>
              <option value="">All shows</option>
              {shows.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Status</label>
            <select value={filters.status} onChange={set('status')}>
              <option value="">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Sex</label>
            <select value={filters.sex} onChange={set('sex')}>
              <option value="">All</option>
              <option value="DOG">Dog</option>
              <option value="BITCH">Bitch</option>
            </select>
          </div>
          <div className="form-row"><label>Registration no.</label><input value={filters.registrationNumber} onChange={set('registrationNumber')} /></div>
          <div className="form-row"><label>Dog name</label><input value={filters.dogName} onChange={set('dogName')} /></div>
          <div className="form-row"><label>Owner</label><input value={filters.owner} onChange={set('owner')} /></div>
          <div className="form-row"><label>Exhibitor</label><input value={filters.exhibitor} onChange={set('exhibitor')} /></div>
          <div className="form-row"><label>Catalogue no.</label><input value={filters.catalogueNumber} onChange={set('catalogueNumber')} /></div>
          <div className="form-row"><label>Breed</label><input value={filters.breed} onChange={set('breed')} /></div>
        </div>
        <button className="btn" onClick={load}>Search</button>
      </div>

      {loading ? <div className="loading">Loading…</div> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Cat #</th><th>Dog</th><th>Reg no.</th><th>Sex</th><th>Show</th><th>Class</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{e.catalogueCode || e.catalogueNumber || '—'}</td>
                  <td>{e.dogName}{e.isManualEntry && <span className="muted"> (manual)</span>}</td>
                  <td>{e.registrationNumber}</td>
                  <td>{e.sex}</td>
                  <td>{e.show?.name}</td>
                  <td>{e.showClass?.name || '—'}</td>
                  <td><span className={`badge ${e.status}`}>{e.status}</span></td>
                  <td><Link to={`/admin/entries/${e.id}`} className="btn ghost sm">Open</Link></td>
                </tr>
              ))}
              {entries.length === 0 && <tr><td colSpan="8" className="muted">No entries found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
