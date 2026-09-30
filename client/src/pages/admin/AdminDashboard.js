import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/dashboard').then((res) => setStats(res.data.stats));
  }, []);

  if (!stats) return <div className="loading">Loading…</div>;

  const items = [
    { label: 'Shows', value: stats.shows },
    { label: 'Pending entries', value: stats.pendingEntries },
    { label: 'Approved entries', value: stats.approvedEntries },
    { label: 'Registered dogs', value: stats.dogs },
  ];

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="grid cols-3">
        {items.map((i) => (
          <div className="card stat" key={i.label}>
            <div className="num">{i.value}</div>
            <div className="muted">{i.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
