import { api } from './index';

export const adminApi = {
  getAnalytics: async () => {
    const response = await api.get('/admin/analytics/overview');
    return response.data.data;
  },
  
  getFacilities: async () => {
    const response = await api.get('/admin/facilities');
    return response.data.data;
  },
  
  getBookings: async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const response = await api.get('/admin/bookings', { params });
    return response.data;
  },
  
  approveFacility: async (id: string) => {
    const response = await api.post(`/admin/facilities/${id}/approve`);
    return response.data.data;
  },
  
  rejectFacility: async (id: string, reason: string) => {
    const response = await api.post(`/admin/facilities/${id}/reject`, { reason });
    return response.data.data;
  },
  
  getUsers: async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },
  
  updateUser: async (id: string, data: { status?: string; role?: string }) => {
    const response = await api.patch(`/admin/users/${id}`, data);
    return response.data.data;
  },

  refundBooking: async (id: string, amountCents?: number) => {
    const response = await api.post(`/admin/bookings/${id}/refund`, { amountCents });
    return response.data.data;
  },

  cancelBooking: async (id: string) => {
    const response = await api.post(`/admin/bookings/${id}/cancel`);
    return response.data.data;
  }
};
