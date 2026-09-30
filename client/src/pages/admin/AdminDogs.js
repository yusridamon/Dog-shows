import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '../../utils/api';

export default function AdminDogs() {
  const [q, setQ] = useState('');
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/admin/dogs', { params: { q: q || undefined } })
      .then((res) => setDogs(res.data.dogs))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  return (
    <div>
      <h1>Central Dog Registry</h1>
      <div className="card">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex">
          <input placeholder="Search reg no, name, owner, breed" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn">Search</button>
        </form>
      </div>

      {loading ? <div className="loading">Loading…</div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Reg no.</th><th>Name</th><th>Sex</th><th>Breed</th><th>DOB</th><th>Owner</th><th>Source</th></tr></thead>
            <tbody>
              {dogs.map((d) => (
                <tr key={d.id}>
                  <td>{d.registrationNumber}</td>
                  <td>{d.fullName}</td>
                  <td>{d.sex || '—'}</td>
                  <td>{d.breed || '—'}</td>
                  <td>{d.birthDate ? format(new Date(d.birthDate), 'PP') : '—'}</td>
                  <td>{d.ownerName || '—'}</td>
                  <td>{d.source}</td>
                </tr>
              ))}
              {dogs.length === 0 && <tr><td colSpan="7" className="muted">No dogs found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
