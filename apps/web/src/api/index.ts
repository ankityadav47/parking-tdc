import { ApiClient } from '@parkspot/api-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ghostwhite-badger-995775.hostingersite.com/api/v1';

export const apiClient = new ApiClient(API_BASE_URL);

export const api = apiClient.instance;

// Restore token from localStorage on startup
const savedToken = localStorage.getItem('driver_access_token');
if (savedToken) {
  apiClient.setToken(savedToken);
}

const protectedDriverPaths = ['/dashboard', '/vehicles', '/checkout', '/reservations'];

// When refresh fails, redirect only from protected driver pages.
apiClient.setOnAuthFailure(() => {
  localStorage.removeItem('driver_access_token');
  localStorage.removeItem('driver_token');

  const isProtectedPage = protectedDriverPaths.some((path) =>
    window.location.pathname === path || window.location.pathname.startsWith(`${path}/`)
  );

  if (isProtectedPage && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
});
