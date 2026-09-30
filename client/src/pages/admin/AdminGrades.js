import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function AdminGrades() {
  const [grades, setGrades] = useState([]);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('');

  const load = () => api.get('/admin/grades').then((res) => setGrades(res.data.grades));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/grades', { name, sortOrder: sortOrder || 0 });
      toast.success('Grade added.');
      setName(''); setSortOrder('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add grade.');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this grade?')) return;
    await api.delete(`/admin/grades/${id}`);
    load();
  };

  return (
    <div>
      <h1>Grades</h1>
      <p className="muted">Grades are configurable and reusable across shows. They attach to a show entry, never to the dog itself.</p>

      <div className="card">
        <form onSubmit={add} className="flex">
          <input placeholder="Grade name" value={name} onChange={(e) => setName(e.target.value)} required style={{ maxWidth: 240 }} />
          <input placeholder="Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ maxWidth: 100 }} />
          <button className="btn">Add grade</button>
        </form>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Order</th><th>Active</th><th /></tr></thead>
          <tbody>
            {grades.map((g) => (
              <tr key={g.id}>
                <td>{g.name}</td>
                <td>{g.sortOrder}</td>
                <td>{g.isActive ? 'Yes' : 'No'}</td>
                <td><button className="btn danger sm" onClick={() => remove(g.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
