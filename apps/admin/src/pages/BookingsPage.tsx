import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { Search, RefreshCw, Eye } from 'lucide-react';

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  expired: 'bg-slate-100 text-slate-500 border-slate-200',
};

const getDuration = (start: string, end: string) => {
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  const hours = Math.round(diffMs / (1000 * 60 * 60));
  if (hours < 24) return `${hours} hrs`;
  return `${Math.round(hours / 24)} days`;
};

export default function BookingsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['admin-bookings', search, statusFilter],
    queryFn: () => adminApi.getBookings({ search: search || undefined, status: statusFilter, limit: 100 }),
  });

  const bookings = bookingsData?.reservations || [];
  
  // Note: For counts, we rely on the returned data or a separate counts endpoint.
  // We'll calculate counts based on the current fetched list, which might just be the current page.
  const counts = {
    confirmed: bookings.filter((b: any) => b.status === 'confirmed').length,
    pending: bookings.filter((b: any) => b.status === 'pending').length,
    cancelled: bookings.filter((b: any) => b.status === 'cancelled').length,
    completed: bookings.filter((b: any) => b.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Booking Management</h1>
        <p className="text-slate-500 mt-1">View all reservations, issue manual refunds, and resolve disputes.</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {(['confirmed', 'pending', 'cancelled', 'completed']).map((status) => (
          <div key={status} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">{status}</p>
            <p className="text-3xl font-black mt-1 text-slate-900">{counts[status as keyof typeof counts] || 0}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search by driver or booking ID..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-4 py-2.5 outline-none">
          <option value="all">All Status</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading bookings...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Booking ID', 'Driver', 'Facility', 'Date', 'Duration', 'Amount', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">{b.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-5 py-4 font-medium text-slate-800">{b.driver?.fullName || 'Unknown'}</td>
                    <td className="px-5 py-4 text-slate-600">{b.facility?.name || 'Unknown Facility'}</td>
                    <td className="px-5 py-4 text-slate-500">{new Date(b.startAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4 text-slate-600">{getDuration(b.startAt, b.endAt)}</td>
                    <td className="px-5 py-4 font-bold text-slate-900">
                      {b.currency === 'INR' ? '₹' : '$'}{(b.totalCents / 100).toFixed(2)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold border px-2.5 py-1 rounded-full ${STATUS_STYLE[b.status] || 'bg-slate-50 text-slate-700'}`}>
                        {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Eye className="w-4 h-4" /></button>
                        {b.status === 'confirmed' && (
                          <button className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Issue Refund"><RefreshCw className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
