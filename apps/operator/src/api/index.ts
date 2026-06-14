import { ApiClient } from '@parkspot/api-client';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ghostwhite-badger-995775.hostingersite.com/api/v1';

export const apiClient = new ApiClient(API_BASE_URL);
export const api = apiClient.instance;

// Restore token from localStorage on startup
const savedToken = localStorage.getItem('operator_access_token');
if (savedToken) {
  apiClient.setToken(savedToken);
}

// When refresh fails (session expired), redirect to login
apiClient.setOnAuthFailure(() => {
  localStorage.removeItem('operator_access_token');
  localStorage.removeItem('operator_token');
  window.location.href = '/login';
});
