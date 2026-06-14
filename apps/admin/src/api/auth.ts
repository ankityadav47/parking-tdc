import { api, apiClient } from './index';

export const authApi = {
  login: async (data: any) => {
    const response = await api.post('/auth/login', data);
    const { user, accessToken } = response.data.data;
    if (user.role !== 'admin') {
      throw new Error('Unauthorized: You must be an admin to access this portal.');
    }
    apiClient.setToken(accessToken);
    localStorage.setItem('admin_access_token', accessToken);
    return { user, accessToken };
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    apiClient.setToken(null);
    localStorage.removeItem('admin_access_token');
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data.data;
  },

  changePassword: async (data: any) => {
    const response = await api.post('/auth/change-password', data);
    return response.data.data;
  },
};
