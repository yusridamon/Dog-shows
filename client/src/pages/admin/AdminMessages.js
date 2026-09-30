import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '../../utils/api';

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);

  const load = () => api.get('/admin/messages').then((res) => setMessages(res.data.messages));
  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.put(`/admin/messages/${id}/read`);
    load();
  };

  return (
    <div>
      <h1>Contact Messages</h1>
      {messages.length === 0 && <p className="muted">No messages.</p>}
      {messages.map((m) => (
        <div className="card" key={m.id} style={{ opacity: m.isRead ? 0.7 : 1 }}>
          <div className="flex between">
            <strong>{m.subject}</strong>
            <span className="muted">{format(new Date(m.createdAt), 'PPp')}</span>
          </div>
          <div className="muted">{m.name} · {m.email}{m.phone ? ` · ${m.phone}` : ''}</div>
          <p>{m.message}</p>
          {!m.isRead && <button className="btn ghost sm" onClick={() => markRead(m.id)}>Mark as read</button>}
        </div>
      ))}
    </div>
  );
}
