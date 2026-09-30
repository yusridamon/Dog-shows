import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="container">
        <NavLink to="/" className="brand">
          <img src="/crc-logo.png" alt="Cape Rottweiler Club" className="brand-logo" />
          <span>Cape Rottweiler Club</span>
        </NavLink>
        <nav>
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/shows">Shows</NavLink>
          <NavLink to="/rules">Rules</NavLink>
          <NavLink to="/enter">Enter Dog</NavLink>
          <NavLink to="/catalogue">Catalogue</NavLink>
          <NavLink to="/contact">Contact</NavLink>
        </nav>
      </div>
    </header>
  );
}
