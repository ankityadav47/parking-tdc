import React from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/useAuthStore';

export default function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      logout();
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xl leading-none tracking-tighter">
              P
            </div>
            <span className="text-xl font-bold text-blue-600 tracking-tight">ParkSpot</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-700">
          <a href="#" className="hover:text-blue-600">About</a>
          <a href="#" className="hover:text-blue-600">Contact Sales</a>
          <a href="https://operatorparking.thedigitalcaptain.com/" target="_blank" rel="noopener noreferrer" className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors font-bold">
            For Business
          </a>

          <div className="w-px h-4 bg-gray-300 mx-2"></div>

          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-gray-900">{user?.fullName}</span>
              <button onClick={handleLogout} className="text-gray-600 hover:text-gray-900">
                Log Out
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="hover:text-blue-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Log In
              </Link>
              <Link to="/register" className="hover:text-blue-600">Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
