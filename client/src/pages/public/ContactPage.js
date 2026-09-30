import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/contact', form);
      toast.success('Message sent.');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h1>Contact</h1>
      <div className="card" style={{ maxWidth: 600 }}>
        <form onSubmit={submit}>
          <div className="form-row">
            <label>Name</label>
            <input value={form.name} onChange={update('name')} required />
          </div>
          <div className="grid cols-2">
            <div className="form-row">
              <label>Email</label>
              <input type="email" value={form.email} onChange={update('email')} required />
            </div>
            <div className="form-row">
              <label>Phone</label>
              <input value={form.phone} onChange={update('phone')} />
            </div>
          </div>
          <div className="form-row">
            <label>Subject</label>
            <input value={form.subject} onChange={update('subject')} required />
          </div>
          <div className="form-row">
            <label>Message</label>
            <textarea value={form.message} onChange={update('message')} required />
          </div>
          <button className="btn" disabled={sending}>{sending ? 'Sending…' : 'Send message'}</button>
        </form>
      </div>
    </div>
  );
}
