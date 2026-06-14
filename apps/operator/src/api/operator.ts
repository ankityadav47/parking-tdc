import { api } from './index';

export const operatorApi = {
  getFacilities: async () => {
    const res = await api.get('/operator/facilities');
    return res.data.data;
  },

  createFacility: async (data: any) => {
    const res = await api.post('/operator/facilities', data);
    return res.data.data;
  },

  updateAmenities: async (id: string, amenities: Record<string, boolean>) => {
    const res = await api.post(`/operator/facilities/${id}/amenities`, amenities);
    return res.data.data;
  },

  addRateRule: async (id: string, data: any) => {
    const res = await api.post(`/operator/facilities/${id}/rate-rules`, data);
    return res.data.data;
  },

  submitForReview: async (id: string) => {
    const res = await api.post(`/operator/facilities/${id}/submit`);
    return res.data.data;
  },

  uploadPhoto: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(`/operator/facilities/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  getReservations: async () => {
    const res = await api.get('/operator/reservations');
    return res.data.data;
  },

  getEarnings: async () => {
    const res = await api.get('/operator/earnings');
    return res.data.data;
  },
};
