import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, DollarSign, Download, AlertCircle } from 'lucide-react';
import { operatorApi } from '../api/operator';

function formatINR(cents: number): string {
  return '₹' + Math.round(cents / 100).toLocaleString('en-IN');
}

export default function EarningsPage() {
  const { data: earnings, isLoading, error, refetch } = useQuery({
    queryKey: ['operator-earnings'],
    queryFn: operatorApi.getEarnings,
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Loading earnings data...</p>
      </div>
    );
  }

  if (error) {
    const errMsg = (error as any)?.response?.data?.error?.message || (error as any)?.message || 'Failed to load earnings';
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="font-bold text-slate-800 text-lg">Failed to Load Earnings</h3>
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

  const rev = earnings?.totalRevenueCents || 0;
  const fee = earnings?.platformFeeCents || 0;
  const net = earnings?.netEarningsCents || 0;
  const bookings = earnings?.bookingCount || 0;
  const feeRate = rev > 0 ? Math.round((fee / rev) * 100) : 10;

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
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{formatINR(rev)}</div>
          <div className="text-sm text-slate-500 mt-0.5">Gross Revenue</div>
          <div className="text-xs text-slate-400 mt-1">All confirmed bookings</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{formatINR(net)}</div>
          <div className="text-sm text-slate-500 mt-0.5">Net Earnings</div>
          <div className="text-xs text-slate-400 mt-1">After {feeRate}% platform fee</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{bookings}</div>
          <div className="text-sm text-slate-500 mt-0.5">Total Bookings</div>
          <div className="text-xs text-slate-400 mt-1">Confirmed & completed</div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-900 mb-5">Revenue Breakdown</h2>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-slate-600">Gross Revenue</span>
              <span className="font-bold text-slate-900">{formatINR(rev)}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div className="bg-green-500 h-2.5 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-slate-600">Platform Fee ({feeRate}%)</span>
              <span className="font-bold text-slate-900">-{formatINR(fee)}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div className="bg-amber-400 h-2.5 rounded-full" style={{ width: rev > 0 ? `${(fee / rev) * 100}%` : '0%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-slate-600 font-semibold">Net Earnings</span>
              <span className="font-bold text-blue-600">{formatINR(net)}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: rev > 0 ? `${(net / rev) * 100}%` : '0%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">How earnings work:</p>
        <p>Revenue is calculated from all confirmed and completed bookings across your facilities. Platform fee is applied per booking. Payouts are processed at the end of each billing cycle.</p>
      </div>
    </div>
  );
}
