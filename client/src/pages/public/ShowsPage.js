import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../../utils/api';

export default function ShowsPage() {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/shows')
      .then((res) => setShows(res.data.shows))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading shows…</div>;

  return (
    <div>
      <h1>Shows</h1>
      {shows.length === 0 && <p className="muted">No published shows yet.</p>}
      <div className="grid cols-2">
        {shows.map((s) => (
          <div className="card" key={s.id}>
            <h3>{s.name}</h3>
            <p className="muted">
              {format(new Date(s.showDate), 'PPP')}
              {s.location ? ` · ${s.location}` : ''}
            </p>
            {s.description && <p>{s.description}</p>}
            <div className="flex">
              <Link to="/enter" className="btn sm">Enter a dog</Link>
              <Link to={`/catalogue/${s.id}`} className="btn ghost sm">Catalogue</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
