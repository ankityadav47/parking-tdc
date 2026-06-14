import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { ShieldCheck, ShieldX, Eye, Clock, CheckCircle, XCircle, MapPin, Star } from 'lucide-react';

type FacilityStatus = 'pending' | 'approved' | 'rejected';
const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
};

export default function ModerationPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  const { data: facilities, isLoading } = useQuery({
    queryKey: ['admin-facilities'],
    queryFn: adminApi.getFacilities,
  });

  const approveMutation = useMutation({
    mutationFn: adminApi.approveFacility,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-facilities'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.rejectFacility(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-facilities'] }),
  });

  const updateStatus = (id: string, status: 'approved' | 'rejected') => {
    if (status === 'approved') {
      if (confirm('Approve this facility?')) approveMutation.mutate(id);
    } else {
      const reason = prompt('Reason for rejection:');
      if (reason) rejectMutation.mutate({ id, reason });
    }
  };

  const counts = {
    pending: facilities?.filter((f: any) => f.status === 'pending_review').length || 0,
    approved: facilities?.filter((f: any) => f.status === 'active').length || 0,
    rejected: facilities?.filter((f: any) => f.status === 'rejected').length || 0,
  };

  if (isLoading) return <div className="p-8 text-slate-500 font-medium">Loading facilities...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Facility Moderation</h1>
        <p className="text-slate-500 mt-1">Review and approve operator facility submissions before they go live.</p>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-4">
        {([['pending', 'Awaiting Review', 'bg-amber-50 text-amber-700'], ['approved', 'Approved', 'bg-green-50 text-green-700'], ['rejected', 'Rejected', 'bg-red-50 text-red-600']] as const).map(([key, label, cls]) => (
          <div key={key} className={`rounded-2xl border p-5 ${cls} border-current border-opacity-20`}>
            <p className="text-sm font-medium opacity-80">{label}</p>
            <p className="text-4xl font-black mt-1">{counts[key]}</p>
          </div>
        ))}
      </div>

      {/* Facilities Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Facility', 'Operator', 'City', 'Spots', 'Submitted', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {facilities?.map((f: any) => {
                const amenitiesList = [];
                if (f.amenities) {
                  if (f.amenities.covered) amenitiesList.push('Covered');
                  if (f.amenities.evCharging) amenitiesList.push('EV Charging');
                  if (f.amenities.adaAccessible) amenitiesList.push('ADA Accessible');
                  if (f.amenities.valet) amenitiesList.push('Valet');
                  if (f.amenities.inOutPrivileges) amenitiesList.push('In/Out Privileges');
                  if (f.amenities.gated) amenitiesList.push('Gated');
                  if (f.amenities.attended) amenitiesList.push('Attended');
                  if (f.amenities.motorcycle) amenitiesList.push('Motorcycle');
                  if (f.amenities.oversized) amenitiesList.push('Oversized');
                }
                return (
                <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-semibold text-slate-900">{f.name}</span>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {amenitiesList.map((a: string, i: number) => (
                        <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{a}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-800">{f.operator?.user?.fullName || 'Unknown Operator'}</p>
                    <p className="text-slate-500 text-xs">{f.operator?.user?.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1 text-slate-600"><MapPin className="w-3.5 h-3.5" />{f.city}</span>
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-800">{f.totalCapacity}</td>
                  <td className="px-5 py-4 text-slate-500">{new Date(f.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-semibold border px-2.5 py-1 rounded-full ${STATUS_STYLE[f.status] || STATUS_STYLE['pending']}`}>
                      {f.status === 'pending_review' ? 'Pending' : f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelected(selected === f.id ? null : f.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {f.status === 'pending_review' && (
                        <>
                          <button
                            onClick={() => updateStatus(f.id, 'approved')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => updateStatus(f.id, 'rejected')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                    {selected === f.id && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1 w-56">
                        <p><strong>Name:</strong> {f.name}</p>
                        <p><strong>Operator:</strong> {f.operator?.user?.fullName}</p>
                        <p><strong>City:</strong> {f.city}</p>
                        <p><strong>Spots:</strong> {f.totalCapacity}</p>
                        <p><strong>Amenities:</strong> {amenitiesList.join(', ') || 'None'}</p>
                      </div>
                    )}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
