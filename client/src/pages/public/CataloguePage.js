import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../../utils/api';

export default function CataloguePage() {
  const { showId: paramShowId } = useParams();
  const [shows, setShows] = useState([]);
  const [showId, setShowId] = useState(paramShowId || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '', sex: '', breed: '', classId: '' });
  const [critiqueEntry, setCritiqueEntry] = useState(null); // entry shown in the critique modal

  useEffect(() => {
    api.get('/shows').then((res) => {
      setShows(res.data.shows);
      if (!paramShowId && res.data.shows.length) setShowId(String(res.data.shows[0].id));
    });
  }, [paramShowId]);

  const load = () => {
    if (!showId) return;
    setLoading(true);
    api.get(`/shows/${showId}/catalogue`, {
      params: {
        search: filters.search || undefined,
        sex: filters.sex || undefined,
        breed: filters.breed || undefined,
        classId: filters.classId || undefined,
      },
    })
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [showId]);

  // Group entries Sex -> Class (matches the printed catalogue: "Males: Junior").
  const grouped = useMemo(() => {
    if (!data) return [];
    const sexOrder = { DOG: 0, BITCH: 1 };
    const bySex = {};
    for (const e of data.entries) {
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
  }, [data]);

  const classes = data?.show?.classes || [];

  const exportPdf = () => {
    const showName = data?.show?.name || 'catalogue';
    const prevTitle = document.title;
    // The saved PDF is named after the document title in most browsers.
    document.title = `${showName} - Catalogue`;
    window.print();
    // Restore the title shortly after the print dialog opens.
    setTimeout(() => { document.title = prevTitle; }, 500);
  };

  return (
    <div className="catalogue-page">
      <div className="flex between no-print">
        <h1>Digital Catalogue</h1>
        {data && data.entries.length > 0 && (
          <button className="btn" onClick={exportPdf}>Export to PDF</button>
        )}
      </div>

      <div className="card no-print">
        <div className="grid cols-2">
          <div className="form-row">
            <label>Show</label>
            <select value={showId} onChange={(e) => setShowId(e.target.value)}>
              {shows.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Search (dog, reg no, exhibitor)</label>
            <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Sex</label>
            <select value={filters.sex} onChange={(e) => setFilters({ ...filters, sex: e.target.value })}>
              <option value="">All</option>
              <option value="DOG">Dogs</option>
              <option value="BITCH">Bitches</option>
            </select>
          </div>
          <div className="form-row">
            <label>Class</label>
            <select value={filters.classId} onChange={(e) => setFilters({ ...filters, classId: e.target.value })}>
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.sex})</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Breed</label>
            <input value={filters.breed} onChange={(e) => setFilters({ ...filters, breed: e.target.value })} />
          </div>
        </div>
        <button className="btn" onClick={load}>Apply filters</button>
      </div>

      {loading && <div className="loading no-print">Loading catalogue…</div>}

      {!loading && data && data.catalogueReleased === false && (
        <div className="card no-print" style={{ textAlign: 'center' }}>
          <h3 style={{ marginTop: 0 }}>Catalogue not yet available</h3>
          <p className="muted">
            The catalogue for this show has not been released yet. It will appear here once entries
            have been finalised. Please check back closer to the show.
          </p>
        </div>
      )}

      {!loading && data && data.catalogueReleased !== false && data.entries.length === 0 && (
        <p className="muted no-print">No approved entries in this catalogue.</p>
      )}

      {/* Print-only header for the exported PDF */}
      {!loading && data && data.entries.length > 0 && (
        <div className="print-only print-header">
          <h1>{data.show?.name}</h1>
          {data.show?.showDate && (
            <p>{format(new Date(data.show.showDate), 'PPP')}{data.show?.location ? ` · ${data.show.location}` : ''}</p>
          )}
          <p>Show Catalogue</p>
        </div>
      )}

      {!loading && grouped.map((sexGroup) => (
        <div key={sexGroup.sex}>
          <h2 className="section-title">{sexGroup.label}</h2>
          {sexGroup.classes.map((cls) => (
            <div key={cls.className}>
              <h2 className="cat-class-title">{sexGroup.label}: {cls.className}</h2>
              <div>
                {cls.entries.map((e) => (
                  <CatalogueCard key={e.id} entry={e} onShowCritique={setCritiqueEntry} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {critiqueEntry && (
        <CritiqueModal entry={critiqueEntry} onClose={() => setCritiqueEntry(null)} />
      )}
    </div>
  );
}

function CritiqueModal({ entry, onClose }) {
  const c = entry.critique;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex between">
          <h3 style={{ margin: 0 }}>
            {entry.catalogueCode ? `${entry.catalogueCode} · ` : ''}{entry.dogName}
          </h3>
          <button className="btn ghost sm" onClick={onClose}>✕</button>
        </div>
        <div className="muted" style={{ marginBottom: '0.75rem' }}>
          Judge's Critique
        </div>
        {c ? (
          <>
            <p style={{ fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{c.text}</p>
            <div className="muted">
              — {c.judgeName}
              {c.critiqueDate ? ` · ${format(new Date(c.critiqueDate), 'PP')}` : ''}
            </div>
          </>
        ) : (
          <p className="muted">No critique has been published for this dog yet.</p>
        )}
      </div>
    </div>
  );
}

function CatalogueCard({ entry, onShowCritique }) {
  const sexLabel = entry.sex === 'DOG' ? 'DOG' : entry.sex === 'BITCH' ? 'BITCH' : entry.sex;
  const dob = entry.dateOfBirth ? format(new Date(entry.dateOfBirth), 'yyyy/MM/dd') : '';

  return (
    <div className="cat-entry">
      {/* Left column: catalogue code, class, grade */}
      <div className="cat-left">
        <div className="cat-code">{entry.catalogueCode || `#${entry.catalogueNumber ?? '—'}`}</div>
        <div className="cat-class">{entry.showClass ? entry.showClass.name : ''}</div>
        <div className="cat-grade">
          Grade:{entry.grade ? ` ${entry.grade.name}${entry.placing != null ? entry.placing : ''}` : ''}
        </div>
      </div>

      {/* Right column: dog details */}
      <div className="cat-right">
        <div className="cat-line">
          <span className="cat-name">
            {entry.qualifications ? `${entry.qualifications} ` : ''}{entry.dogName}
          </span>
          <span className="cat-owner"><span className="cat-lbl">Owner</span> {entry.ownerName || '—'}</span>
        </div>
        <div className="cat-line">
          <span>{entry.breed || ''}</span>
          <span>{sexLabel}</span>
        </div>
        <div className="cat-line">
          <span>Reg. No: {entry.registrationNumber}</span>
          <span>DOB: {dob}</span>
        </div>
        <div className="cat-line">
          <span>Chip. No: {entry.microchip || ''}</span>
          <span>Tat No: {entry.tattoo || ''}</span>
        </div>
        <div className="cat-line">
          <span className="cat-parents">
            <em>Sire: {entry.sireName || '—'}</em><br />
            <em>Dam: {entry.damName || '—'}</em>
          </span>
          {entry.breederName && (
            <span className="cat-breeder"><span className="cat-lbl">Breeder</span> {entry.breederName}</span>
          )}
        </div>
        {entry.critique && (
          <>
            <div style={{ marginTop: '0.5rem' }} className="no-print">
              <button className="btn sm" onClick={() => onShowCritique(entry)}>
                Show Judge's Critique
              </button>
            </div>
            {/* In the printed PDF, show the critique text inline instead of a button. */}
            <div className="print-only" style={{ marginTop: '0.5rem' }}>
              <strong>Judge's critique:</strong> <em>{entry.critique.text}</em>
              <div className="muted">— {entry.critique.judgeName}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
