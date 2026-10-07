import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Layout from './components/layout/Layout';
import AdminLayout from './components/admin/AdminLayout';
import ProtectedRoute from './components/admin/ProtectedRoute';

import HomePage from './pages/public/HomePage';
import ShowsPage from './pages/public/ShowsPage';
import RulesPage from './pages/public/RulesPage';
import EnterDogPage from './pages/public/EnterDogPage';
import CataloguePage from './pages/public/CataloguePage';
import ContactPage from './pages/public/ContactPage';

import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminShows from './pages/admin/AdminShows';
import AdminShowDetail from './pages/admin/AdminShowDetail';
import AdminEntries from './pages/admin/AdminEntries';
import AdminEntryDetail from './pages/admin/AdminEntryDetail';
import AdminGrades from './pages/admin/AdminGrades';
import AdminDogs from './pages/admin/AdminDogs';
import AdminMessages from './pages/admin/AdminMessages';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shows" element={<ShowsPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/enter" element={<EnterDogPage />} />
        <Route path="/catalogue" element={<CataloguePage />} />
        <Route path="/catalogue/:showId" element={<CataloguePage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      {/* Admin auth */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Admin protected */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="shows" element={<AdminShows />} />
        <Route path="shows/:id" element={<AdminShowDetail />} />
        <Route path="shows/:id/catalogue" element={<AdminShowDetail />} />
        <Route path="entries" element={<AdminEntries />} />
        <Route path="entries/:id" element={<AdminEntryDetail />} />
        <Route path="grades" element={<AdminGrades />} />
        <Route path="dogs" element={<AdminDogs />} />
        <Route path="messages" element={<AdminMessages />} />
      </Route>
    </Routes>
  );
}
