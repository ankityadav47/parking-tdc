import React, { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from './components/AdminLayout';
import DashboardPage from './pages/DashboardPage';
import ModerationPage from './pages/ModerationPage';
import UsersPage from './pages/UsersPage';
import BookingsPage from './pages/BookingsPage';
import PromosPage from './pages/PromosPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import { authApi } from './api/auth';
import { useAuthStore } from './store/useAuthStore';

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-bold text-xl">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default function App() {
  const { setAuth, setLoading } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-me'],
    queryFn: authApi.getMe,
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!isLoading) {
      if (data && data.role === 'admin') {
        setAuth(data, 'existing-session');
      } else {
        setLoading(false);
      }
    }
  }, [data, isLoading, setAuth, setLoading]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/moderation" element={<ModerationPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/promos" element={<PromosPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
