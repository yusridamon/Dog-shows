import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

/**
 * Read-only reference of the official KUSA grading chart. Grades are a national
 * standard with fixed age bands and descriptions, so they are not edited here;
 * this screen is a quick reference the judging team can consult.
 */
export default function AdminGrades() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/grades')
      .then((res) => setGrades(res.data.grades))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading grades…</div>;

  return (
    <div>
      <h1>Grading reference</h1>
      <p className="muted">
        The official KUSA grading chart. Grades attach to a show entry (never to the dog itself)
        and are recorded per class in each show's Catalogue &amp; judging tab. Age is the dog's
        age in months on the show date.
      </p>

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
                  <td style={{ fontSize: '0.85rem' }}>{g.explanation || ''}</td>
                </tr>
              );
            })}
            {grades.length === 0 && <tr><td colSpan="5" className="muted">No grades configured.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: '0.5rem' }}>
        Placings are entered alongside the grade, shown as V1, V2, SG3 and so on in the catalogue.
      </p>
    </div>
  );
}
