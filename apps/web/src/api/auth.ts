import { api, apiClient } from './index';
import { LoginDto, RegisterDto } from '@parkspot/types';

export const authApi = {
  login: async (data: LoginDto) => {
    const response = await api.post('/auth/login', data);
    const { user, accessToken } = response.data.data;
    apiClient.setToken(accessToken);
    return { user, accessToken };
  },

  register: async (data: RegisterDto) => {
    const response = await api.post('/auth/register', data);
    const { user, accessToken } = response.data.data;
    apiClient.setToken(accessToken);
    return { user, accessToken };
  },

  logout: async () => {
    await api.post('/auth/logout');
    apiClient.setToken(null);
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data.data;
  },
};
