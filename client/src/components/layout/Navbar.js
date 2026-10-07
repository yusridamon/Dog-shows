import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/shows', label: 'Shows' },
  { to: '/rules', label: 'Rules' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="navbar">
      <div className="container navbar-bar">
        <NavLink to="/" className="brand" onClick={close}>
          <img src="/crc-logo.png" alt="Cape Rottweiler Club" className="brand-logo" />
          <span className="brand-text">Cape Rottweiler Club</span>
        </NavLink>

        <button
          className="nav-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>

        <nav className={`nav-links ${open ? 'open' : ''}`}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} onClick={close}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
