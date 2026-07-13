import React, { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authApi } from './api/auth';
import { useAuthStore } from './store/useAuthStore';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import FacilityDetailPage from './pages/FacilityDetailPage';
import CheckoutPage from './pages/CheckoutPage';
import ConfirmationPage from './pages/ConfirmationPage';
import DriverDashboard from './pages/DriverDashboard';
import VehiclesPage from './pages/VehiclesPage';
import DirectionsPage from './pages/DirectionsPage';
import MarketingPage from './pages/MarketingPage';

// Protected Route wrapper
function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-blue-600">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}



export default function App() {
  const { setAuth, setLoading } = useAuthStore();

  // Try to load user session on mount
  const { data, isError, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    retry: false, // Don't retry on 401
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!isLoading) {
      if (data) {
        setAuth(data, 'existing-session');
      } else {
        setLoading(false);
      }
    }
  }, [data, isLoading, isError, setAuth, setLoading]);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/facilities/:id" element={<FacilityDetailPage />} />
      <Route path="/directions" element={<DirectionsPage />} />
      <Route path="/about" element={<MarketingPage title="About ParkSpot" description="ParkSpot helps drivers find, compare, and book parking with simple search, clear pricing, and digital reservations." />} />
      <Route path="/contact-sales" element={<MarketingPage title="Contact Sales" description="Connect with ParkSpot to list parking locations, manage demand, and help more drivers book your spaces." ctaLabel="For Business" ctaTo="https://operatorparking.thedigitalcaptain.com/" />} />
      <Route path="/monthly" element={<MarketingPage title="Monthly Parking" description="Monthly parking options are coming soon. Search available hourly parking now and reserve a spot near your destination." />} />
      <Route path="/venues" element={<MarketingPage title="Event Parking" description="Find convenient parking near popular stadiums, arenas, and event venues." items={['Madison Square Garden', 'Yankee Stadium', 'Wrigley Field']} />} />
      <Route path="/airports" element={<MarketingPage title="Airport Parking" description="Book airport parking near terminals, long-term lots, and shuttle-friendly facilities." items={['JFK Airport', 'LAX Airport', "O'Hare Airport"]} />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DriverDashboard />} />
        <Route path="/vehicles" element={<VehiclesPage />} />
        <Route path="/checkout/:id" element={<CheckoutPage />} />
        <Route path="/reservations/:id" element={<ConfirmationPage />} />
      </Route>
    </Routes>
  );
}
