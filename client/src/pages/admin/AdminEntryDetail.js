import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../utils/api';

export default function AdminEntryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [grades, setGrades] = useState([]);
  const [reason, setReason] = useState('');
  const [correction, setCorrection] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [critique, setCritique] = useState({ judgeName: '', text: '' });

  const load = () =>
    api.get(`/admin/entries/${id}`).then((res) => {
      const e = res.data.entry;
      setEntry(e);
      setGradeId(e.gradeId ? String(e.gradeId) : '');
      if (e.critique) {
        setCritique({ judgeName: e.critique.judgeName, text: e.critique.text });
      }
    });

  useEffect(() => {
    load();
    api.get('/admin/grades').then((res) => setGrades(res.data.grades));
    // eslint-disable-next-line
  }, [id]);

  const act = async (fn, ok) => {
    try {
      await fn();
      toast.success(ok);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    }
  };

  if (!entry) return <div className="loading">Loading…</div>;

  return (
    <div>
      <button className="btn ghost sm" onClick={() => navigate(-1)} style={{ marginBottom: '0.75rem' }}>← Back</button>
      <div className="flex between">
        <h1>{entry.dogName}</h1>
        <span className={`badge ${entry.status}`}>{entry.status}</span>
      </div>

      <div className="card">
        <h3>Dog & entry details</h3>
        <div className="grid cols-2">
          <div><strong>Registration:</strong> {entry.registrationNumber}</div>
          <div><strong>Sex:</strong> {entry.sex}</div>
          <div><strong>DOB:</strong> {format(new Date(entry.dateOfBirth), 'yyyy/MM/dd')}</div>
          <div><strong>Breed:</strong> {entry.breed || '—'}</div>
          <div><strong>Colour:</strong> {entry.colour || '—'}</div>
          <div><strong>Qualifications:</strong> {entry.qualifications || '—'}</div>
          <div><strong>Microchip:</strong> {entry.microchip || '—'}</div>
          <div><strong>Tattoo:</strong> {entry.tattoo || '—'}</div>
          <div><strong>Sire:</strong> {entry.sireName || '—'}</div>
          <div><strong>Dam:</strong> {entry.damName || '—'}</div>
          <div><strong>Breeder:</strong> {entry.breederName || '—'}</div>
          <div><strong>Owner:</strong> {entry.ownerName || '—'}</div>
          <div><strong>Owner KUSA no.:</strong> {entry.ownerKusaNo || '—'}</div>
          <div><strong>Show:</strong> {entry.show?.name}</div>
          <div><strong>Class:</strong> {entry.showClass?.name || 'Not assigned'}</div>
          <div><strong>Catalogue no.:</strong> {entry.catalogueCode || entry.catalogueNumber || '—'}</div>
          <div><strong>Exhibitor:</strong> {entry.exhibitorName}</div>
          <div><strong>Contact:</strong> {entry.exhibitorEmail || entry.exhibitorPhone || '—'}</div>
        </div>
        <p style={{ marginTop: '0.75rem' }} className="flex">
          {entry.generatedFormPath && (
            <a href={fileUrl(entry.generatedFormPath)} target="_blank" rel="noreferrer" className="btn ghost sm">View signed entry form</a>
          )}
          {entry.entryFormPath && (
            <a href={fileUrl(entry.entryFormPath)} target="_blank" rel="noreferrer" className="btn ghost sm">Uploaded form</a>
          )}
          {!entry.generatedFormPath && !entry.entryFormPath && <span className="muted">No entry form.</span>}
          {entry.isManualEntry && (
            entry.pedigreeDocPath
              ? <a href={fileUrl(entry.pedigreeDocPath)} target="_blank" rel="noreferrer" className="btn ghost sm">View pedigree document</a>
              : <span className="muted">No pedigree uploaded.</span>
          )}
        </p>
        {entry.signatureName && (
          <p className="muted" style={{ marginTop: '0.25rem' }}>
            Electronically signed by <strong>{entry.signatureName}</strong>
            {entry.signedAt ? ` on ${format(new Date(entry.signedAt), 'PPp')}` : ''}
            {entry.declarationAgreed ? ' · declaration agreed' : ''}
            {entry.paymentMethod ? ` · payment: ${entry.paymentMethod}` : ''}
          </p>
        )}
        {entry.rejectionReason && <p className="error-text">Rejected: {entry.rejectionReason}</p>}
        {entry.correctionNote && <p className="muted">Correction requested: {entry.correctionNote}</p>}
      </div>

      <div className="card">
        <h3>Review</h3>
        <div className="flex" style={{ marginBottom: '0.75rem' }}>
          <button className="btn success" onClick={() => act(() => api.post(`/admin/entries/${id}/approve`), 'Approved. Class & catalogue number assigned.')}>Approve</button>
          <button className="btn ghost" onClick={() => act(() => api.post(`/admin/entries/${id}/withdraw`), 'Withdrawn.')}>Withdraw</button>
        </div>
        <div className="grid cols-2">
          <div className="form-row">
            <label>Reject with reason</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" />
            <button className="btn danger sm" style={{ marginTop: 6 }}
              onClick={() => reason ? act(() => api.post(`/admin/entries/${id}/reject`, { reason }), 'Rejected.') : toast.error('Enter a reason.')}>
              Reject
            </button>
          </div>
          <div className="form-row">
            <label>Request correction</label>
            <input value={correction} onChange={(e) => setCorrection(e.target.value)} placeholder="What to fix" />
            <button className="btn sm" style={{ marginTop: 6 }}
              onClick={() => correction ? act(() => api.post(`/admin/entries/${id}/request-correction`, { note: correction }), 'Correction requested.') : toast.error('Enter a note.')}>
              Request correction
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Grading</h3>
        <div className="flex">
          <select value={gradeId} onChange={(e) => setGradeId(e.target.value)} style={{ maxWidth: 240 }}>
            <option value="">No grade</option>
            {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button className="btn" onClick={() => act(() => api.post(`/admin/entries/${id}/grade`, { gradeId: gradeId || null }), 'Grade saved.')}>Save grade</button>
          <button className="btn ghost" onClick={() => act(() => api.post(`/admin/entries/${id}/grade`, { gradeId: gradeId || null, markCompleted: true }), 'Grade saved & marked completed.')}>Save & mark completed</button>
        </div>
      </div>

      <div className="card">
        <h3>Judge's critique</h3>
        <p className="muted">
          Critiques are saved as drafts. Publish them all at once from the show page
          (Shows → open the show → Publish critiques) at the end of the show.
        </p>
        <div className="form-row">
          <label>Judge</label>
          <input value={critique.judgeName} onChange={(e) => setCritique({ ...critique, judgeName: e.target.value })} />
        </div>
        <div className="form-row">
          <label>Critique</label>
          <textarea value={critique.text} onChange={(e) => setCritique({ ...critique, text: e.target.value })} />
        </div>
        {entry.critique && (
          <p style={{ marginTop: 0 }}>
            Status:{' '}
            {entry.critique.isPublished
              ? <span className="badge APPROVED">Published</span>
              : <span className="badge PENDING">Draft</span>}
          </p>
        )}
        <button className="btn"
          onClick={() => act(() => api.put(`/admin/entries/${id}/critique`, critique), 'Critique saved as draft.')}>
          Save critique
        </button>
      </div>
    </div>
  );
}
