import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Car, Plus, Trash2, Edit2, ArrowLeft, Star } from 'lucide-react';
import { usersApi, Vehicle } from '../api/users';
import Header from '../components/Header';

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState<Partial<Vehicle> | null>(null);

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: usersApi.getVehicles,
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Vehicle>) => {
      if (data.id) return usersApi.updateVehicle(data.id, data);
      return usersApi.addVehicle(data as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setIsEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.removeVehicle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isEditing) saveMutation.mutate(isEditing);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard" className="p-2 -ml-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">My Vehicles</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage the cars you use for parking.</p>
          </div>
        </div>

        {isEditing ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{isEditing.id ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">License Plate *</label>
                  <input required type="text" value={isEditing.licensePlate || ''} onChange={e => setIsEditing({...isEditing, licensePlate: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm uppercase outline-none focus:ring-2 focus:ring-blue-500" placeholder="ABC-1234" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">State *</label>
                  <input required type="text" value={isEditing.state || ''} onChange={e => setIsEditing({...isEditing, state: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm uppercase outline-none focus:ring-2 focus:ring-blue-500" placeholder="NY" maxLength={2} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Make</label>
                  <input type="text" value={isEditing.make || ''} onChange={e => setIsEditing({...isEditing, make: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Toyota" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Model</label>
                  <input type="text" value={isEditing.model || ''} onChange={e => setIsEditing({...isEditing, model: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Camry" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Color</label>
                  <input type="text" value={isEditing.color || ''} onChange={e => setIsEditing({...isEditing, color: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Silver" />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="isDefault" checked={!!isEditing.isDefault} onChange={e => setIsEditing({...isEditing, isDefault: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                <label htmlFor="isDefault" className="text-sm font-medium text-slate-700">Set as default vehicle</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsEditing(null)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50">
                  {saveMutation.isPending ? 'Saving...' : 'Save Vehicle'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <button 
              onClick={() => setIsEditing({ isDefault: vehicles?.length === 0 })}
              className="w-full bg-white border-2 border-dashed border-slate-300 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
            >
              <Plus className="w-6 h-6" />
              <span className="font-bold text-sm">Add New Vehicle</span>
            </button>

            {isLoading ? (
              <div className="animate-pulse flex gap-4 bg-white p-5 rounded-2xl border border-slate-200">
                <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
                <div className="flex-1 space-y-2 py-1"><div className="h-4 bg-slate-200 rounded w-1/3"></div><div className="h-3 bg-slate-200 rounded w-1/4"></div></div>
              </div>
            ) : (
              vehicles?.map((v) => (
                <div key={v.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                      <Car className="w-6 h-6 text-slate-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-lg uppercase tracking-wider">{v.licensePlate} <span className="text-sm font-medium text-slate-500">{v.state}</span></h3>
                        {v.isDefault && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Star className="w-3 h-3 fill-amber-500" /> Default</span>}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {v.color} {v.make} {v.model}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setIsEditing(v)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => { if(confirm('Delete vehicle?')) deleteMutation.mutate(v.id) }} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
