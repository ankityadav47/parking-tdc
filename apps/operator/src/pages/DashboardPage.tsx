import React from 'react';
import { Building2, CalendarDays, DollarSign, TrendingUp, Plus, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATS = [
  { label: 'Active Facilities', value: '3', icon: Building2, color: 'bg-blue-50 text-blue-600', trend: '+1 this month' },
  { label: 'This Month Bookings', value: '142', icon: CalendarDays, color: 'bg-green-50 text-green-600', trend: '+18% vs last month' },
  { label: 'Monthly Revenue', value: '₹84,200', icon: DollarSign, color: 'bg-amber-50 text-amber-600', trend: '+22% vs last month' },
  { label: 'Avg Occupancy', value: '73%', icon: TrendingUp, color: 'bg-purple-50 text-purple-600', trend: 'Peak: Fri–Sat' },
];

const RECENT = [
  { id: 'RES-201', driver: 'Arjun Mehta', facility: 'MG Road Parking', time: '2:00 PM – 5:00 PM', amount: '₹360', status: 'confirmed' },
  { id: 'RES-200', driver: 'Priya Sharma', facility: 'Koramangala Lot B', time: '9:00 AM – 12:00 PM', amount: '₹270', status: 'confirmed' },
  { id: 'RES-199', driver: 'Rohan Das', facility: 'MG Road Parking', time: '6:00 PM – 9:00 PM', amount: '₹420', status: 'pending' },
  { id: 'RES-198', driver: 'Sneha Patel', facility: 'Indiranagar Garage', time: '8:00 AM – 10:00 AM', amount: '₹180', status: 'completed' },
];

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'bg-green-50 text-green-700',
  pending: 'bg-amber-50 text-amber-700',
  completed: 'bg-slate-100 text-slate-600',
};

export default function DashboardPage() {
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
        {STATS.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">{s.value}</div>
            <div className="text-sm font-medium text-slate-600 mt-0.5">{s.label}</div>
            <div className="text-xs text-slate-400 mt-1">{s.trend}</div>
          </div>
        ))}
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
            {RECENT.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 font-mono text-xs text-slate-500">{r.id}</td>
                <td className="px-6 py-3 font-medium text-slate-900">{r.driver}</td>
                <td className="px-6 py-3 text-slate-600 hidden md:table-cell">{r.facility}</td>
                <td className="px-6 py-3 text-slate-500 hidden lg:table-cell">{r.time}</td>
                <td className="px-6 py-3 font-bold text-slate-900">{r.amount}</td>
                <td className="px-6 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status]}`}>
                    {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
