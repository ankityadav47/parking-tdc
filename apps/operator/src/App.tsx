import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import OperatorLayout from './components/OperatorLayout';
import DashboardPage from './pages/DashboardPage';
import FacilitiesPage from './pages/FacilitiesPage';
import FacilityViewPage from './pages/FacilityViewPage';
import EditFacilityPage from './pages/EditFacilityPage';
import CreateFacilityPage from './pages/CreateFacilityPage';
import ReservationsPage from './pages/ReservationsPage';
import EarningsPage from './pages/EarningsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { apiClient } from './api/index';

function isAuthenticated() {
  // Check if we have a token in memory or in localStorage
  const token = localStorage.getItem('operator_access_token');
  if (token) {
    apiClient.setToken(token); // ensure it's set in client
    return true;
  }
  return false;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <OperatorLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="facilities" element={<FacilitiesPage />} />
        <Route path="facilities/new" element={<CreateFacilityPage />} />
        <Route path="facilities/:id" element={<FacilityViewPage />} />
        <Route path="facilities/:id/edit" element={<EditFacilityPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="earnings" element={<EarningsPage />} />
      </Route>
    </Routes>
  );
}
