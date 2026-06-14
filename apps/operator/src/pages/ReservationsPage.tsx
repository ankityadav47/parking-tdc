import React, { useState } from 'react';
import { MapPin, Search, QrCode } from 'lucide-react';

const RESERVATIONS = [
  { id: 'RES-201', driver: 'Arjun Mehta', vehicle: 'KA01AB1234', facility: 'MG Road Parking', date: 'Jun 12, 2026', time: '2:00 PM – 5:00 PM', amount: '₹360', status: 'confirmed' },
  { id: 'RES-200', driver: 'Priya Sharma', vehicle: 'KA05CD5678', facility: 'Koramangala Lot B', date: 'Jun 12, 2026', time: '9:00 AM – 12:00 PM', amount: '₹270', status: 'confirmed' },
  { id: 'RES-199', driver: 'Rohan Das', vehicle: 'MH02EF9012', facility: 'MG Road Parking', date: 'Jun 12, 2026', time: '6:00 PM – 9:00 PM', amount: '₹420', status: 'pending' },
  { id: 'RES-198', driver: 'Sneha Patel', vehicle: 'KA01GH3456', facility: 'Indiranagar Garage', date: 'Jun 11, 2026', time: '8:00 AM – 10:00 AM', amount: '₹180', status: 'completed' },
  { id: 'RES-197', driver: 'Vikram Singh', vehicle: 'DL09IJ7890', facility: 'MG Road Parking', date: 'Jun 11, 2026', time: '11:00 AM – 2:00 PM', amount: '₹270', status: 'completed' },
  { id: 'RES-196', driver: 'Kavya Nair', vehicle: 'TN07KL2345', facility: 'Koramangala Lot B', date: 'Jun 10, 2026', time: '4:00 PM – 8:00 PM', amount: '₹480', status: 'cancelled' },
];

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'bg-green-50 text-green-700',
  pending: 'bg-amber-50 text-amber-700',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-50 text-red-600',
};

export default function ReservationsPage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = RESERVATIONS
    .filter(r => filter === 'all' || r.status === filter)
    .filter(r => r.driver.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase()));

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
            placeholder="Search driver or ID..."
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
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5">
                  <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">{r.id}</span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="font-semibold text-slate-900">{r.driver}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />{r.vehicle}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-slate-600 hidden md:table-cell">{r.facility}</td>
                <td className="px-5 py-3.5 hidden lg:table-cell">
                  <div className="text-slate-700">{r.date}</div>
                  <div className="text-xs text-slate-400">{r.time}</div>
                </td>
                <td className="px-5 py-3.5 font-bold text-slate-900">{r.amount}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[r.status]}`}>
                    {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  {r.status === 'confirmed' && (
                    <button className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
                      <QrCode className="w-3.5 h-3.5" /> Validate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">No reservations found.</div>
        )}
      </div>
    </div>
  );
}
