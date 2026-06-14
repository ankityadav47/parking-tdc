import { api } from './index';

export interface Vehicle {
  id: string;
  licensePlate: string;
  state: string;
  make: string | null;
  model: string | null;
  color: string | null;
  isDefault: boolean;
}

export const usersApi = {
  getVehicles: async (): Promise<Vehicle[]> => {
    const response = await api.get('/users/me/vehicles');
    return response.data.data;
  },

  addVehicle: async (data: Omit<Vehicle, 'id'>): Promise<Vehicle> => {
    const response = await api.post('/users/me/vehicles', data);
    return response.data.data;
  },

  updateVehicle: async (id: string, data: Partial<Omit<Vehicle, 'id'>>): Promise<Vehicle> => {
    const response = await api.patch(`/users/me/vehicles/${id}`, data);
    return response.data.data;
  },

  removeVehicle: async (id: string): Promise<void> => {
    await api.delete(`/users/me/vehicles/${id}`);
  },
};
