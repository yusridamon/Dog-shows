import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../../utils/api';

// Live-updating countdown to a target datetime. Ticks every second.
function useCountdown(target) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return { closed: true };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { closed: false, days, hours, mins, secs };
}

function EntriesStatus({ closeAt }) {
  const cd = useCountdown(closeAt);
  if (!closeAt) return <span className="muted">Entries open</span>;
  if (cd.closed) {
    return <span className="badge REJECTED">Entries closed</span>;
  }
  return (
    <div>
      <div className="muted">Entries close in</div>
      <div style={{ fontWeight: 700, color: 'var(--navy)' }}>
        {cd.days > 0 && `${cd.days}d `}{cd.hours}h {cd.mins}m {cd.secs}s
      </div>
      <div className="muted">on {format(new Date(closeAt), 'PPp')}</div>
    </div>
  );
}

function ShowCard({ show, past }) {
  const closed = show.entriesCloseAt && new Date() > new Date(show.entriesCloseAt);
  const canEnter = !past && !closed;
  return (
    <div className="card" key={show.id}>
      <h3>{show.name}</h3>
      <p className="muted">
        {format(new Date(show.showDate), 'PPP')}
        {show.location ? ` · ${show.location}` : ''}
      </p>
      {show.description && <p>{show.description}</p>}

      {!past && (
        <div style={{ margin: '0.5rem 0 0.75rem' }}>
          <EntriesStatus closeAt={show.entriesCloseAt} />
        </div>
      )}

      <div className="flex">
        {canEnter && <Link to={`/enter?show=${show.id}`} className="btn sm">Enter a dog</Link>}
        {!canEnter && !past && <span className="btn sm" style={{ opacity: 0.5, pointerEvents: 'none' }}>Entries closed</span>}
        <Link to={`/catalogue/${show.id}`} className="btn ghost sm">Catalogue</Link>
      </div>
    </div>
  );
}

export default function ShowsPage() {
  const [shows, setShows] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/shows')
      .then((res) => setShows(res.data.shows))
      .finally(() => setLoading(false));
    api.get('/grades').then((res) => setGrades(res.data.grades)).catch(() => {});
  }, []);

  // Split into upcoming/current vs past based on the show date.
  const { upcoming, past } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const up = [];
    const old = [];
    for (const s of shows) {
      if (new Date(s.showDate) >= today) up.push(s);
      else old.push(s);
    }
    up.sort((a, b) => new Date(a.showDate) - new Date(b.showDate)); // soonest first
    old.sort((a, b) => new Date(b.showDate) - new Date(a.showDate)); // most recent first
    return { upcoming: up, past: old };
  }, [shows]);

  if (loading) return <div className="loading">Loading shows…</div>;

  return (
    <div>
      <h1>Shows</h1>
      {shows.length === 0 && <p className="muted">No published shows yet.</p>}

      {upcoming.length > 0 && (
        <>
          <h2 className="section-title">Upcoming shows</h2>
          <div className="grid cols-2">
            {upcoming.map((s) => <ShowCard key={s.id} show={s} />)}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <h2 className="section-title">Past shows</h2>
          <div className="grid cols-2">
            {past.map((s) => <ShowCard key={s.id} show={s} past />)}
          </div>
        </>
      )}

      {grades.length > 0 && (
        <>
          <h2 className="section-title">Gradings explained</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Age</th>
                  <th>Grading</th>
                  <th>English</th>
                  <th>German</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => {
                  let age = '—';
                  if (g.minAgeMonths != null && g.maxAgeMonths != null) age = `${g.minAgeMonths} to ${g.maxAgeMonths} months`;
                  else if (g.minAgeMonths != null) age = `Over ${g.minAgeMonths} months`;
                  return (
                    <tr key={g.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{age}</td>
                      <td style={{ fontWeight: 700 }}>{g.name}</td>
                      <td>{g.englishDescription || ''}</td>
                      <td>{g.germanName || ''}</td>
                      <td style={{ fontSize: '0.82rem' }}>{g.explanation || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            Placings are shown next to the grade in the catalogue, for example V1, V2, SG3.
          </p>
        </>
      )}
    </div>
  );
}
