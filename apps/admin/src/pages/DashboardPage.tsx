import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, Car, DollarSign, ArrowUpRight, ArrowDownRight, MapPin } from 'lucide-react';
import { adminApi } from '../api/admin';

const MONTH_BARS = [40, 60, 45, 80, 65, 90, 75, 100, 85, 95, 110, 105];
const MAX_BAR = Math.max(...MONTH_BARS);

export default function DashboardPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: adminApi.getAnalytics,
  });

  const STATS = [
    { label: 'Total GMV', value: `$${((analytics?.totalGmvCents || 0) / 100).toLocaleString()}`, trend: '+14.2%', isPositive: true, icon: DollarSign },
    { label: 'Platform Revenue', value: `$${((analytics?.platformRevenueCents || 0) / 100).toLocaleString()}`, trend: '+14.2%', isPositive: true, icon: TrendingUp },
    { label: 'Active Users', value: (analytics?.totalUsers || 0).toLocaleString(), trend: '+5.4%', isPositive: true, icon: Users },
    { label: 'Total Bookings', value: (analytics?.totalBookings || 0).toLocaleString(), trend: '-2.1%', isPositive: false, icon: Car },
  ];

  const TOP_FACILITIES = [
    { name: 'JFK Airport Valet', city: 'New York', revenue: '$45,200', bookings: 1204 },
    { name: 'Downtown Garage Hub', city: 'Chicago', revenue: '$28,100', bookings: 840 },
    { name: 'LAX Long Term', city: 'Los Angeles', revenue: '$22,450', bookings: 610 },
    { name: 'Union Square Secure', city: 'San Francisco', revenue: '$18,900', bookings: 490 },
  ];

  if (isLoading) return <div className="p-8 text-slate-500 font-medium">Loading analytics...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Platform Overview</h1>
          <p className="text-slate-500 mt-1">Analytics and metrics across the entire ParkSpot network.</p>
        </div>
        <select className="bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-red-500">
          <option>Last 30 Days</option>
          <option>This Month</option>
          <option>This Year</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STATS.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-slate-700" />
              </div>
              <span className={`flex items-center text-sm font-bold ${stat.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {stat.isPositive ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                {stat.trend}
              </span>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">{stat.label}</h3>
            <p className="text-3xl font-black text-slate-900 mt-1 tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Revenue Trends</h3>
            <button className="text-red-600 text-sm font-semibold hover:underline">Download Report</button>
          </div>
          <div className="h-64 flex items-end justify-between gap-2">
            {MONTH_BARS.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div
                  className="w-full bg-red-500 rounded-t-md group-hover:bg-red-600 transition-colors"
                  style={{ height: (val / MAX_BAR * 100) + '%', minHeight: '4px' }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3 text-xs font-semibold text-slate-400 uppercase">
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>

        {/* Top Facilities */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Top Performing Facilities</h3>
          <div className="space-y-5">
            {TOP_FACILITIES.map((facility, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{facility.name}</h4>
                    <p className="text-xs text-slate-500">{facility.city}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{facility.revenue}</p>
                  <p className="text-xs text-slate-500">{facility.bookings} bookings</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
