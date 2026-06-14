import { ApiClient } from '@parkspot/api-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

export const apiClient = new ApiClient(API_BASE_URL);

export const api = apiClient.instance;
