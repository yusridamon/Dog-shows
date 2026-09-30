import React from 'react';
import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div>
      <section className="hero hero-tablemountain" style={{ borderRadius: 12, margin: '-1.5rem -1rem 1.5rem' }}>
        <div className="container">
          <img
            src={`${process.env.PUBLIC_URL}/crc-logo.png`}
            alt="Cape Rottweiler Club"
            className="hero-logo"
          />
          <h1>Cape Rottweiler Club</h1>
          <p>
            Online show entries and the digital catalogue for the Cape Rottweiler Club.
            Look up your dog by registration number, confirm the details, and you're entered.
            Approved entries appear in the catalogue with grading and judge critiques.
          </p>
          <div className="flex" style={{ justifyContent: 'center' }}>
            <Link to="/enter" className="btn accent">Enter Dog</Link>
            <Link to="/catalogue" className="btn ghost" style={{ color: '#fff', borderColor: '#ffffff55' }}>
              View Catalogue
            </Link>
          </div>
        </div>
      </section>

      <div className="grid cols-3">
        <div className="card">
          <h3>1. Enter</h3>
          <p className="muted">Enter your dog's registration number. We look it up and pre-fill the details, or you can enter manually and upload a pedigree.</p>
        </div>
        <div className="card">
          <h3>2. Approval</h3>
          <p className="muted">Show officials review entries. Once approved, the system assigns a class based on age and sex, plus a catalogue number.</p>
        </div>
        <div className="card">
          <h3>3. Catalogue</h3>
          <p className="muted">Browse the digital catalogue by class and sex. Search by dog, registration number or exhibitor. Results and critiques appear during judging.</p>
        </div>
      </div>
    </div>
  );
}
