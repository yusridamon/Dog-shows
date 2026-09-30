import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container flex between">
        <div>© {new Date().getFullYear()} Cape Rottweiler Club · Cape Town, South Africa</div>
        <Link to="/admin/login" style={{ color: '#c7d2e0' }}>Admin</Link>
      </div>
    </footer>
  );
}
