import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/shows', label: 'Shows' },
  { to: '/admin/entries', label: 'Search entries' },
  { to: '/admin/grades', label: 'Grading reference' },
  { to: '/admin/dogs', label: 'Dog Registry' },
  { to: '/admin/messages', label: 'Messages' },
];

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${open ? 'open' : ''}`}>
        <div className="admin-sidebar-head">
          <span className="brand">🐾 Admin</span>
          <button className="admin-close" aria-label="Close menu" onClick={() => setOpen(false)}>
            <X size={22} />
          </button>
        </div>
        {navItems.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)}>
            {n.label}
          </NavLink>
        ))}
      </aside>

      {/* Backdrop when the mobile sidebar is open */}
      {open && <div className="admin-backdrop" onClick={() => setOpen(false)} />}

      <div className="admin-main">
        <div className="admin-topbar">
          <button className="admin-menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="muted">Signed in as {admin?.name}</div>
          <div className="spacer" />
          <button className="btn ghost sm" onClick={handleLogout}>Log out</button>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
