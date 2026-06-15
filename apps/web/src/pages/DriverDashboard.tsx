import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { authApi } from '../api/auth';
import { api } from '../api';
import {
  Car,
  MapPin,
  Clock,
  CreditCard,
  Star,
  Search,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
  QrCode,
  Navigation,
  Calendar,
  Shield,
  Plus,
  UserRound,
  Mail,
  BadgeCheck,
  Phone,
  ListChecks,
} from 'lucide-react';

type DriverBooking = {
  id: string;
  code?: string;
  facilityName: string;
  address?: string;
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
  date: string;
  time?: string;
  duration?: string;
  price: string;
  status: string;
  vehicle?: string;
  paymentStatus?: string;
  rating?: number | null;
  startAt?: string;
  endAt?: string;
};

const MOCK_UPCOMING: DriverBooking[] = [
  {
    id: 'RES-001',
    code: 'PS-MOCK01',
    facilityName: 'Downtown Central Garage',
    address: '123 Main St, New York, NY',
    city: 'New York',
    state: 'NY',
    date: 'Jun 15, 2026',
    time: '10:00 AM - 2:00 PM',
    duration: '4 hrs',
    price: '$24.00',
    status: 'confirmed',
    vehicle: 'NY ABC-1234',
    paymentStatus: 'succeeded',
  },
  {
    id: 'RES-002',
    code: 'PS-MOCK02',
    facilityName: 'Harbor Valet Parking',
    address: '45 Harbor Blvd, New York, NY',
    city: 'New York',
    state: 'NY',
    date: 'Jun 20, 2026',
    time: '6:00 PM - 11:00 PM',
    duration: '5 hrs',
    price: '$45.00',
    status: 'pending',
    vehicle: 'NY ABC-1234',
    paymentStatus: 'pending',
  },
];

const MOCK_HISTORY: DriverBooking[] = [
  { id: 'RES-099', code: 'PS-MOCK99', facilityName: 'Airport Long-Term Lot B', address: 'Terminal 4, JFK Airport, NY', city: 'New York', state: 'NY', date: 'Jun 10, 2026', time: '8:00 AM - 8:00 PM', duration: '12 hrs', price: '$108.30', status: 'completed', vehicle: 'NY ABC-1234', paymentStatus: 'succeeded', rating: 4 },
  { id: 'RES-098', code: 'PS-MOCK98', facilityName: 'City Center Garage', address: '88 Center Ave, New York, NY', city: 'New York', state: 'NY', date: 'May 29, 2026', time: '1:00 PM - 4:00 PM', duration: '3 hrs', price: '$18.00', status: 'completed', vehicle: 'NY ABC-1234', paymentStatus: 'succeeded', rating: 5 },
  { id: 'RES-097', code: 'PS-MOCK97', facilityName: 'Riverside Open Lot', address: '14 Riverside Dr, New York, NY', city: 'New York', state: 'NY', date: 'May 14, 2026', time: '9:30 AM - 12:30 PM', duration: '3 hrs', price: '$12.00', status: 'cancelled', vehicle: 'NY ABC-1234', paymentStatus: 'refunded', rating: null },
];

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-slate-100 text-slate-600 border-slate-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
  canceled: 'bg-red-50 text-red-600 border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirm',
  pending: 'Pending',
  completed: 'Complete',
  cancelled: 'Cancel',
  canceled: 'Cancel',
};

const MOCK_ALL_BOOKINGS = [...MOCK_UPCOMING, ...MOCK_HISTORY];

function formatDate(value?: string) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeRange(start?: string, end?: string) {
  if (!start || !end) return undefined;
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function formatDuration(start?: string, end?: string) {
  if (!start || !end) return undefined;
  const hours = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 3600000));
  return `${hours} hr${hours > 1 ? 's' : ''}`;
}

function normalizeBooking(booking: any): DriverBooking {
  const address = booking.facility
    ? [booking.facility.addressLine1, booking.facility.city, booking.facility.state].filter(Boolean).join(', ')
    : undefined;

  return {
    id: booking.id,
    code: booking.code,
    facilityName: booking.facility?.name || 'Parking Facility',
    address,
    city: booking.facility?.city,
    state: booking.facility?.state,
    lat: booking.facility?.lat ? Number(booking.facility.lat) : undefined,
    lng: booking.facility?.lng ? Number(booking.facility.lng) : undefined,
    date: formatDate(booking.startAt),
    time: formatTimeRange(booking.startAt, booking.endAt),
    duration: formatDuration(booking.startAt, booking.endAt),
    price: `${booking.currency === 'USD' ? '$' : '₹'}${((booking.totalCents || 0) / 100).toFixed(2)}`,
    status: booking.status,
    vehicle: booking.vehicle ? `${booking.vehicle.state || ''} ${booking.vehicle.licensePlate || ''}`.trim() : undefined,
    paymentStatus: booking.payment?.status,
    startAt: booking.startAt,
    endAt: booking.endAt,
  };
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DriverDashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history' | 'all'>('upcoming');

  const { data: apiBookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['driver-bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings');
      return (res.data.data || []).map(normalizeBooking) as DriverBooking[];
    },
    retry: false,
  });

  const allBookings = apiBookings.length > 0 ? apiBookings : MOCK_ALL_BOOKINGS;
  const upcomingBookings = allBookings.filter((booking) => ['confirmed', 'pending'].includes(booking.status));
  const historyBookings = allBookings.filter((booking) => ['completed', 'cancelled', 'canceled'].includes(booking.status));
  const statusCounts = useMemo(() => allBookings.reduce<Record<string, number>>((counts, booking) => {
    counts[booking.status] = (counts[booking.status] || 0) + 1;
    return counts;
  }, {}), [allBookings]);

  const handleLogout = async () => {
    await authApi.logout();
    useAuthStore.getState().logout();
    navigate('/');
  };

  const handleDirections = (booking: DriverBooking) => {
    const name = encodeURIComponent(booking.facilityName || 'Parking Facility');

    if (booking.lat && booking.lng && !isNaN(booking.lat) && !isNaN(booking.lng)) {
      navigate(`/directions?destLat=${booking.lat}&destLng=${booking.lng}&destName=${name}`);
      return;
    }

    const address = booking.address || [booking.facilityName, booking.city, booking.state].filter(Boolean).join(', ');
    if (address) {
      navigate(`/directions?destAddress=${encodeURIComponent(address)}&destName=${name}`);
    }
  };

  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const driverProfile = {
    fullName: user?.fullName || 'Driver',
    email: user?.email || 'driver@example.com',
    status: user?.status || 'active',
    driverId: user?.id || 'mock-driver',
    phone: 'Not added',
    defaultVehicle: allBookings.find((booking) => booking.vehicle)?.vehicle || 'No vehicle added',
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* Top Nav */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xl leading-none">P</div>
            <span className="text-xl font-bold text-blue-600">ParkSpot</span>
          </Link>

          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-900 leading-none">{user?.fullName || 'Driver'}</p>
                <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Log Out">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero Welcome */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-600/20 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Welcome back, {user?.fullName?.split(' ')[0] || 'Driver'}! 👋
            </h1>
            <p className="text-blue-100 mt-2 text-lg">Ready to find your perfect parking spot?</p>
          </div>
          <button
            onClick={() => navigate('/search?address=New York, NY')}
            className="flex-shrink-0 bg-white text-blue-600 font-bold py-3 px-8 rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-md"
          >
            <Search className="w-5 h-5" />
            Find Parking
          </button>
        </div>

        {/* Quick Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by address, venue, or airport..."
            className="flex-1 outline-none text-slate-900 placeholder:text-slate-400 font-medium text-sm sm:text-base"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                navigate(`/search?address=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
              }
            }}
          />
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-xl text-sm transition-colors">Search</button>
        </div>

        {/* Profile Section */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-600/20">
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Driver Profile</h2>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${driverProfile.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {driverProfile.status.charAt(0).toUpperCase() + driverProfile.status.slice(1)}
                  </span>
                </div>
                <p className="text-slate-500 text-sm mt-1">All driver details are shown from the signed-in profile and booking data.</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('all')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <ListChecks className="w-5 h-5" /> View All Booking
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider"><UserRound className="w-4 h-4" /> Name</div>
              <p className="font-bold text-slate-900 mt-2">{driverProfile.fullName}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider"><Mail className="w-4 h-4" /> Email</div>
              <p className="font-bold text-slate-900 mt-2 break-all">{driverProfile.email}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider"><BadgeCheck className="w-4 h-4" /> Driver ID</div>
              <p className="font-bold text-slate-900 mt-2 truncate">{driverProfile.driverId}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider"><Phone className="w-4 h-4" /> Phone</div>
              <p className="font-bold text-slate-900 mt-2">{driverProfile.phone}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Default Vehicle</p>
              <p className="font-bold text-slate-900 mt-1">{driverProfile.defaultVehicle}</p>
            </div>
            <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
              <p className="text-xs text-green-600 font-bold uppercase tracking-wider">Confirm</p>
              <p className="font-black text-2xl text-slate-900">{statusCounts.confirmed || 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Complete</p>
              <p className="font-black text-2xl text-slate-900">{statusCounts.completed || 0}</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">Pending</p>
              <p className="font-black text-2xl text-slate-900">{statusCounts.pending || 0}</p>
            </div>
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
              <p className="text-xs text-red-600 font-bold uppercase tracking-wider">Cancel</p>
              <p className="font-black text-2xl text-slate-900">{(statusCounts.cancelled || 0) + (statusCounts.canceled || 0)}</p>
            </div>
          </div>
        </section>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Car className="w-5 h-5 text-blue-600" />} label="Total Bookings" value={String(allBookings.length)} sub="All time" color="bg-blue-50" />
          <StatCard icon={<CreditCard className="w-5 h-5 text-green-600" />} label="Confirmed" value={String(statusCounts.confirmed || 0)} sub="Active passes" color="bg-green-50" />
          <StatCard icon={<Clock className="w-5 h-5 text-amber-600" />} label="Pending" value={String(statusCounts.pending || 0)} sub="Awaiting confirmation" color="bg-amber-50" />
          <StatCard icon={<Star className="w-5 h-5 text-purple-600" />} label="Completed" value={String(statusCounts.completed || 0)} sub="Finished trips" color="bg-purple-50" />
        </div>

        {/* Reservations */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">My Reservations</h2>
            <Link to="/search" className="text-blue-600 text-sm font-semibold flex items-center gap-1 hover:underline">
              <Plus className="w-4 h-4" /> New booking
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
            <button
              className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'upcoming' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming ({upcomingBookings.length})
            </button>
            <button
              className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setActiveTab('history')}
            >
              History
            </button>
            <button
              className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setActiveTab('all')}
            >
              All Booking ({allBookings.length})
            </button>
          </div>

          {activeTab === 'upcoming' && (
            <div className="space-y-4">
              {upcomingBookings.map((res) => (
                <div key={res.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Car className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900">{res.facilityName}</h3>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[res.status] || STATUS_STYLES.pending}`}>
                            {STATUS_LABELS[res.status] || res.status.charAt(0).toUpperCase() + res.status.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                          <MapPin className="w-3.5 h-3.5" /> {res.address}
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-sm text-slate-700 flex-wrap">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Calendar className="w-4 h-4 text-slate-400" /> {res.date}
                          </span>
                          <span className="flex items-center gap-1.5 font-medium">
                            <Clock className="w-4 h-4 text-slate-400" /> {res.time}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 flex-wrap">
                      <span className="text-2xl font-black text-slate-900">{res.price}</span>
                      <span className="text-xs text-slate-500">{res.duration}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 flex-wrap">
                    <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-colors">
                      <QrCode className="w-4 h-4" /> View Pass
                    </button>
                    <button
                      onClick={() => handleDirections(res)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl text-sm transition-colors"
                    >
                      <Navigation className="w-4 h-4" /> Get Directions
                    </button>
                    <button className="ml-auto text-sm text-red-500 hover:underline font-medium">Cancel</button>
                  </div>
                </div>
              ))}

              {upcomingBookings.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                  <Car className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="font-semibold">No upcoming reservations</p>
                  <Link to="/search" className="text-blue-600 text-sm hover:underline mt-1 inline-block">Find parking now →</Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {historyBookings.map((res) => (
                <div key={res.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Car className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">{res.facilityName}</h3>
                      <div className="text-xs text-slate-500 mt-0.5">{res.date}</div>
                      {res.rating && (
                        <div className="flex items-center gap-0.5 mt-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < res.rating! ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{res.price}</div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[res.status] || STATUS_STYLES.pending}`}>
                        {STATUS_LABELS[res.status] || res.status.charAt(0).toUpperCase() + res.status.slice(1)}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'all' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-900">All Bookings</h3>
                  <p className="text-xs text-slate-500">Confirm, complete, pending, and cancel bookings made by this driver.</p>
                </div>
                {bookingsLoading && <span className="text-xs font-semibold text-blue-600">Loading real bookings...</span>}
              </div>
              <div className="divide-y divide-slate-100">
                {allBookings.map((res) => (
                  <div key={res.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Car className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900">{res.facilityName}</h4>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[res.status] || STATUS_STYLES.pending}`}>
                            {STATUS_LABELS[res.status] || res.status.charAt(0).toUpperCase() + res.status.slice(1)}
                          </span>
                          {res.code && <span className="text-xs font-mono text-slate-400">{res.code}</span>}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                          <MapPin className="w-3.5 h-3.5" /> {res.address || 'Address not available'}
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-sm text-slate-700 flex-wrap">
                          <span className="flex items-center gap-1.5 font-medium"><Calendar className="w-4 h-4 text-slate-400" /> {res.date}</span>
                          {res.time && <span className="flex items-center gap-1.5 font-medium"><Clock className="w-4 h-4 text-slate-400" /> {res.time}</span>}
                          {res.vehicle && <span className="flex items-center gap-1.5 font-medium"><Car className="w-4 h-4 text-slate-400" /> {res.vehicle}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex lg:flex-col items-center lg:items-end gap-3 lg:gap-1 flex-wrap">
                      <span className="text-xl font-black text-slate-900">{res.price}</span>
                      {res.duration && <span className="text-xs text-slate-500">{res.duration}</span>}
                      {res.paymentStatus && <span className="text-xs text-slate-400">Payment: {res.paymentStatus}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-8">
          <Link to="/vehicles" className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <Car className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">My Vehicles</p>
              <p className="text-xs text-slate-500">Manage your cars</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
          </Link>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Payment Methods</p>
              <p className="text-xs text-slate-500">Cards & billing</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <Settings className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Account Settings</p>
              <p className="text-xs text-slate-500">Profile & preferences</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
          </div>
        </div>

      </main>
    </div>
  );
}
