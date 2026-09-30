import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (!admin) return <Navigate to="/admin/login" replace />;
  return children;
}
