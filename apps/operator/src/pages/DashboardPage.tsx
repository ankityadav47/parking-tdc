import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ArrowUpRight, MapPin, DollarSign, Car, TrendingUp } from 'lucide-react';
import { operatorApi } from '../api/operator';

function formatINR(cents: number): string {
  return '₹' + Math.round(cents / 100).toLocaleString('en-IN');
}

export default function DashboardPage() {
  const { data: facilities, isLoading: fLoading } = useQuery({
    queryKey: ['operator-facilities'],
    queryFn: operatorApi.getFacilities,
  });

  const { data: earnings, isLoading: eLoading } = useQuery({
    queryKey: ['operator-earnings'],
    queryFn: operatorApi.getEarnings,
  });

  const { data: reservations, isLoading: rLoading } = useQuery({
    queryKey: ['operator-reservations'],
    queryFn: operatorApi.getReservations,
  });

  const isLoading = fLoading || eLoading || rLoading;
  const activeCount = facilities?.filter((f: any) => f.status === 'active').length || 0;
  const pendingCount = facilities?.filter((f: any) => f.status === 'pending_review').length || 0;

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <Link
          to="/facilities/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Facility
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{activeCount}</div>
          <div className="text-sm font-medium text-slate-600 mt-0.5">Active Listings</div>
          <div className="text-xs text-slate-400 mt-1">{pendingCount} pending review</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {earnings ? formatINR(earnings.totalRevenueCents) : '₹0'}
          </div>
          <div className="text-sm font-medium text-slate-600 mt-0.5">Total Revenue</div>
          <div className="text-xs text-slate-400 mt-1">
            {earnings ? formatINR(earnings.netEarningsCents) + ' net' : '—'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Car className="w-5 h-5 text-amber-600" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {earnings?.bookingCount || 0}
          </div>
          <div className="text-sm font-medium text-slate-600 mt-0.5">Total Bookings</div>
          <div className="text-xs text-slate-400 mt-1">Confirmed & completed</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {facilities?.length || 0}
          </div>
          <div className="text-sm font-medium text-slate-600 mt-0.5">Total Facilities</div>
          <div className="text-xs text-slate-400 mt-1">All statuses</div>
        </div>
      </div>

      {/* Recent Reservations */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Recent Reservations</h2>
          <Link to="/reservations" className="text-sm text-blue-600 font-semibold hover:underline">View all</Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="px-6 py-3">ID</th>
              <th className="px-6 py-3">Driver</th>
              <th className="px-6 py-3 hidden md:table-cell">Facility</th>
              <th className="px-6 py-3 hidden lg:table-cell">Time</th>
              <th className="px-6 py-3">Amount</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(!reservations || reservations.length === 0) ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                  No reservations yet. They'll appear here once drivers start booking your facilities.
                </td>
              </tr>
            ) : (
              (reservations || []).slice(0, 5).map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono text-xs text-slate-500">
                    {r.passCode || r.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-6 py-3 font-medium text-slate-900">{r.driver?.fullName || '—'}</td>
                  <td className="px-6 py-3 text-slate-600 hidden md:table-cell">{r.facility?.name || '—'}</td>
                  <td className="px-6 py-3 text-slate-500 hidden lg:table-cell">
                    {r.startAt ? new Date(r.startAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-6 py-3 font-bold text-slate-900">
                    {r.basePriceCents ? formatINR(r.basePriceCents) : '—'}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.status === 'confirmed' ? 'bg-green-50 text-green-700' :
                        r.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                          r.status === 'completed' ? 'bg-slate-100 text-slate-600' :
                            'bg-red-50 text-red-600'
                      }`}>
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
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
