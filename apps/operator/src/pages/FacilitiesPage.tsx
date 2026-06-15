import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, MapPin, Star, CheckCircle, Clock, XCircle, Edit2, Eye } from 'lucide-react';
import { operatorApi } from '../api/operator';

const STATUS_CONFIG: Record<string, { label: string; style: string; icon: React.ReactNode }> = {
  active: { label: 'Active', style: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  pending_review: { label: 'Pending Review', style: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
  rejected: { label: 'Rejected', style: 'bg-red-50 text-red-600 border-red-200', icon: <XCircle className="w-3.5 h-3.5" /> },
  draft: { label: 'Draft', style: 'bg-slate-100 text-slate-600 border-slate-200', icon: <Edit2 className="w-3.5 h-3.5" /> },
};

export default function FacilitiesPage() {
  const { data: facilities, isLoading, error, refetch } = useQuery({
    queryKey: ['operator-facilities'],
    queryFn: operatorApi.getFacilities,
  });

  if (isLoading) return <div className="p-8 text-slate-500 font-medium">Loading facilities...</div>;

  if (error) {
    const errMsg = (error as any)?.response?.data?.error?.message || (error as any)?.message || 'Failed to load facilities';
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="font-bold text-slate-800 text-lg">Failed to Load Facilities</h3>
        <p className="text-slate-500 text-sm mt-1 mb-4">{errMsg}</p>
        <button
          onClick={() => refetch()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">My Facilities</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your parking facilities and listings.</p>
        </div>
        <Link
          to="/facilities/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Facility
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {facilities?.map((f: any) => {
          const cfg = STATUS_CONFIG[f.status] || STATUS_CONFIG.draft;
          return (
            <div key={f.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {/* Card top color bar */}
              <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-700" />

              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-bold text-slate-900 text-base leading-tight">{f.name}</h3>
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border flex-shrink-0 ${cfg.style}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-slate-500 text-sm mb-4">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{f.addressLine1}, {f.city}</span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center mb-5">
                  <div className="bg-slate-50 rounded-xl p-2">
                    <div className="font-black text-slate-900">{f.totalCapacity - (f._count?.reservations || 0)}</div>
                    <div className="text-xs text-slate-500">Available</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2">
                    <div className="font-black text-slate-900">{f.avgRating || '—'}</div>
                    <div className="text-xs text-slate-500">Rating</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2">
                    <div className="font-black text-slate-900">{f._count?.reservations || 0}</div>
                    <div className="text-xs text-slate-500">Active Now</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium py-2 px-3 rounded-xl text-sm transition-colors">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-xl text-sm transition-colors">
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add new card */}
        <Link
          to="/facilities/new"
          className="bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 flex flex-col items-center justify-center p-10 text-slate-400 hover:text-blue-600 transition-all min-h-[200px] group"
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center mb-3 transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-semibold text-sm">Add New Facility</span>
        </Link>
      </div>
    </div>
  );
}
