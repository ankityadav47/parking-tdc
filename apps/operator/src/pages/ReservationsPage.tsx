import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, QrCode, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { operatorApi } from '../api/operator';

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'bg-green-50 text-green-700',
  pending: 'bg-amber-50 text-amber-700',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-50 text-red-600',
};

function formatINR(cents: number): string {
  return '₹' + Math.round(cents / 100).toLocaleString('en-IN');
}

export default function ReservationsPage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: reservations, isLoading, error, refetch } = useQuery({
    queryKey: ['operator-reservations'],
    queryFn: operatorApi.getReservations,
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => operatorApi.confirmBooking(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operator-reservations'] }),
    onError: (err: any) => alert(err?.response?.data?.message || 'Failed to confirm booking'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => operatorApi.cancelBooking(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operator-reservations'] }),
    onError: (err: any) => alert(err?.response?.data?.message || 'Failed to cancel booking'),
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Loading reservations...</p>
      </div>
    );
  }

  if (error) {
    const errMsg = (error as any)?.response?.data?.error?.message || (error as any)?.message || 'Failed to load reservations';
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="font-bold text-slate-800 text-lg">Failed to Load Reservations</h3>
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

  const filtered = (reservations || [])
    .filter((r: any) => filter === 'all' || r.status === filter)
    .filter((r: any) => {
      if (!search) return true;
      const driverName = (r.driver?.fullName || '').toLowerCase();
      const passCode = (r.passCode || r.code || '').toLowerCase();
      const term = search.toLowerCase();
      return driverName.includes(term) || passCode.includes(term);
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Reservations</h1>
        <p className="text-slate-500 text-sm mt-1">View and manage all bookings across your facilities.</p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search driver or pass code..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl outline-none text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {['all', 'confirmed', 'pending', 'completed', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${filter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <th className="px-5 py-3">Booking</th>
              <th className="px-5 py-3">Driver</th>
              <th className="px-5 py-3 hidden md:table-cell">Facility</th>
              <th className="px-5 py-3 hidden lg:table-cell">Date & Time</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                  No reservations found. They'll appear here once drivers start booking your facilities.
                </td>
              </tr>
            ) : (
              filtered.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {r.code || r.passCode || r.id.slice(0, 8).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-slate-900">{r.driver?.fullName || '—'}</div>
                    <div className="text-xs text-slate-500">{r.driver?.email || ''}</div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell text-slate-600">
                    {r.facility?.name || '—'}
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <div className="text-slate-700">
                      {r.startAt ? new Date(r.startAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {r.startAt ? new Date(r.startAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      {' – '}
                      {r.endAt ? new Date(r.endAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-slate-900">
                    {r.basePriceCents ? formatINR(r.basePriceCents) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLE[r.status] || 'bg-slate-100 text-slate-600'}`}>
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {r.status === 'pending' ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => confirmMutation.mutate(r.id)}
                          disabled={confirmMutation.isPending}
                          title="Confirm Booking"
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                        </button>
                        <button
                          onClick={() => cancelMutation.mutate(r.id)}
                          disabled={cancelMutation.isPending}
                          title="Cancel Booking"
                          className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    ) : r.status === 'confirmed' ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => cancelMutation.mutate(r.id)}
                          disabled={cancelMutation.isPending}
                          title="Cancel Booking"
                          className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Cancel
                        </button>
                        <button className="text-slate-400 hover:text-blue-600 transition-colors" title="Scan QR">
                          <QrCode className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
