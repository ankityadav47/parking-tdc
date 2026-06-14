import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: async () => {
      // Fetching from config
      const res = await api.get('/config');
      return res.data.data;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (mapProvider: 'google' | 'openfreemap') => {
      const res = await api.patch('/config', { mapProvider });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
      setSuccessMsg('Settings updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  });

  if (isLoading) return <div className="p-8 text-gray-500">Loading settings...</div>;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-gray-500 mt-1">Configure global application preferences.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Map Configuration</h2>

        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm border border-green-200">
            {successMsg}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Map Provider
            </label>
            <div className="flex gap-4">
              <label className={`flex-1 border rounded-lg p-4 cursor-pointer flex flex-col items-center gap-2 transition-colors ${data?.mapProvider === 'google' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'}`}>
                <input
                  type="radio"
                  name="mapProvider"
                  value="google"
                  checked={data?.mapProvider === 'google'}
                  onChange={() => updateMutation.mutate('google')}
                  className="sr-only"
                />
                <div className="font-semibold">Google Maps</div>
                <div className="text-xs text-gray-500 text-center">Standard paid maps API</div>
              </label>

              <label className={`flex-1 border rounded-lg p-4 cursor-pointer flex flex-col items-center gap-2 transition-colors ${data?.mapProvider === 'openfreemap' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'}`}>
                <input
                  type="radio"
                  name="mapProvider"
                  value="openfreemap"
                  checked={data?.mapProvider === 'openfreemap'}
                  onChange={() => updateMutation.mutate('openfreemap')}
                  className="sr-only"
                />
                <div className="font-semibold">OpenFreeMap</div>
                <div className="text-xs text-gray-500 text-center">Completely free open-source map</div>
              </label>
            </div>
            {updateMutation.isPending && <p className="text-sm text-blue-600 mt-2">Saving...</p>}
          </div>
        </div>
      </div>

      {/* Account Settings / Change Password */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl mt-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Account Settings</h2>
        
        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const currentPassword = (form.elements.namedItem('currentPassword') as HTMLInputElement).value;
            const newPassword = (form.elements.namedItem('newPassword') as HTMLInputElement).value;
            
            try {
              await api.post('/auth/change-password', { currentPassword, newPassword });
              setSuccessMsg('Password changed successfully!');
              form.reset();
              setTimeout(() => setSuccessMsg(''), 3000);
            } catch (err: any) {
              alert(err.response?.data?.message || 'Failed to change password');
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input type="password" name="currentPassword" required className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input type="password" name="newPassword" required className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-slate-800 transition-colors">
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
