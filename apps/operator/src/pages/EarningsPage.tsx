import React, { useState } from 'react';
import { TrendingUp, DollarSign, Download } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const REVENUE = [42000, 56000, 61000, 55000, 72000, 84200];
const MAX_REV = Math.max(...REVENUE);

const PAYOUTS = [
  { period: 'May 2026', bookings: 118, gross: '₹71,400', fee: '₹7,140', net: '₹64,260', status: 'paid', date: 'Jun 5, 2026' },
  { period: 'Apr 2026', bookings: 99, gross: '₹54,450', fee: '₹5,445', net: '₹49,005', status: 'paid', date: 'May 5, 2026' },
  { period: 'Mar 2026', bookings: 87, gross: '₹60,900', fee: '₹6,090', net: '₹54,810', status: 'paid', date: 'Apr 5, 2026' },
];

export default function EarningsPage() {
  const [period, setPeriod] = useState('jun');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Earnings</h1>
          <p className="text-slate-500 text-sm mt-1">Track your revenue and payout history.</p>
        </div>
        <button className="flex items-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-3"><DollarSign className="w-5 h-5 text-green-600" /></div>
          <div className="text-2xl font-black text-slate-900">₹84,200</div>
          <div className="text-sm text-slate-500 mt-0.5">June Gross Revenue</div>
          <div className="text-xs text-green-600 font-semibold mt-1">+22% vs May</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3"><TrendingUp className="w-5 h-5 text-blue-600" /></div>
          <div className="text-2xl font-black text-slate-900">₹75,780</div>
          <div className="text-sm text-slate-500 mt-0.5">June Net Payout (est.)</div>
          <div className="text-xs text-slate-400 mt-1">After 10% platform fee</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-3"><DollarSign className="w-5 h-5 text-amber-600" /></div>
          <div className="text-2xl font-black text-slate-900">142</div>
          <div className="text-sm text-slate-500 mt-0.5">Bookings This Month</div>
          <div className="text-xs text-green-600 font-semibold mt-1">+18% vs May</div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-900 mb-6">Monthly Revenue (2026)</h2>
        <div className="flex items-end gap-3 h-40">
          {MONTHS.map((m, i) => (
            <div key={m} className="flex-1 flex flex-col items-center gap-2">
              <div className="text-xs font-bold text-slate-600">₹{(REVENUE[i] / 1000).toFixed(0)}k</div>
              <div
                className="w-full rounded-t-lg transition-all"
                style={{
                  height: `${(REVENUE[i] / MAX_REV) * 100}%`,
                  background: i === MONTHS.length - 1 ? '#2563eb' : '#bfdbfe',
                }}
              />
              <div className={`text-xs font-semibold ${i === MONTHS.length - 1 ? 'text-blue-600' : 'text-slate-400'}`}>{m}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Payout History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Payout History</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="px-5 py-3">Period</th>
              <th className="px-5 py-3 hidden sm:table-cell">Bookings</th>
              <th className="px-5 py-3">Gross</th>
              <th className="px-5 py-3 hidden md:table-cell">Fee (10%)</th>
              <th className="px-5 py-3">Net Payout</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {PAYOUTS.map(p => (
              <tr key={p.period} className="hover:bg-slate-50">
                <td className="px-5 py-3.5">
                  <div className="font-semibold text-slate-900">{p.period}</div>
                  <div className="text-xs text-slate-400">{p.date}</div>
                </td>
                <td className="px-5 py-3.5 text-slate-600 hidden sm:table-cell">{p.bookings}</td>
                <td className="px-5 py-3.5 font-medium text-slate-900">{p.gross}</td>
                <td className="px-5 py-3.5 text-red-500 hidden md:table-cell">-{p.fee}</td>
                <td className="px-5 py-3.5 font-black text-slate-900">{p.net}</td>
                <td className="px-5 py-3.5">
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-50 text-green-700">Paid</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
