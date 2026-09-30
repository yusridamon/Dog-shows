import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <span className="brand">🐾 Admin</span>
        <NavLink to="/admin" end>Dashboard</NavLink>
        <NavLink to="/admin/shows">Shows</NavLink>
        <NavLink to="/admin/entries">Entries</NavLink>
        <NavLink to="/admin/grades">Grades</NavLink>
        <NavLink to="/admin/dogs">Dog Registry</NavLink>
        <NavLink to="/admin/messages">Messages</NavLink>
      </aside>
      <div className="admin-main">
        <div className="flex between" style={{ marginBottom: '1rem' }}>
          <div className="muted">Signed in as {admin?.name}</div>
          <button className="btn ghost sm" onClick={handleLogout}>Log out</button>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
