import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout() {
  const texture = `${process.env.PUBLIC_URL}/crc-photo-1.jpg`;
  return (
    <>
      {/* Premium editorial background layers */}
      <div className="site-bg-texture" style={{ backgroundImage: `url(${texture})` }} />
      <div className="site-bg-vignette" />

      <Navbar />
      <main className="container" style={{ paddingTop: '1.5rem', minHeight: '60vh' }}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
