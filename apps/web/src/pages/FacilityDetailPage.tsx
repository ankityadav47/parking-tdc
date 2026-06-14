import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Star, ShieldCheck, Info, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { api } from '../api';

export default function FacilityDetailPage() {
  const { id } = useParams();
  const [facility, setFacility] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [date, setDate] = useState('2026-06-12');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('17:00');

  useEffect(() => {
    async function loadFacility() {
      try {
        const res = await api.get(`/facilities/${id}`);
        setFacility(res.data.data);
      } catch (err) {
        setError('Failed to load facility details.');
      } finally {
        setLoading(false);
      }
    }
    if (id) loadFacility();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 pb-12 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !facility) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 pb-12 flex flex-col items-center justify-center">
        <p className="text-red-500 font-medium mb-4">{error || 'Facility not found'}</p>
        <Link to="/search">
          <Button variant="outline">Return to Search</Button>
        </Link>
      </div>
    );
  }

  // Find hourly rate for display
  const hourlyRule = facility.rateRules?.find((r: any) => r.rateType === 'hourly');
  const pricePerHour = hourlyRule ? hourlyRule.priceCents / 100 : 0;
  const total = pricePerHour * 3; // Mock calculation for 3 hours
  
  // Format amenities
  const activeAmenities: string[] = [];
  if (facility.amenities) {
    if (facility.amenities.covered) activeAmenities.push('Covered');
    if (facility.amenities.evCharging) activeAmenities.push('EV Charging');
    if (facility.amenities.adaAccessible) activeAmenities.push('Wheelchair Accessible');
    if (facility.amenities.valet) activeAmenities.push('Valet');
    if (facility.amenities.gated) activeAmenities.push('Gated');
  }

  // Get images
  const images = facility.photos?.length > 0 
    ? facility.photos.map((p: any) => p.url)
    : ['https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&q=80&w=800']; // default fallback

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back Link */}
        <Link to="/search" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Search
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg uppercase tracking-wide">
                  {facility.type}
                </span>
                <span className="flex items-center gap-1 text-sm font-semibold text-amber-600">
                  <Star className="w-4 h-4 fill-amber-500" />
                  {facility.avgRating || 'New'} ({facility.reviewCount || 0})
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                {facility.name}
              </h1>
              <div className="flex items-center gap-2 text-slate-500 mt-3 text-sm sm:text-base">
                <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <span>{facility.addressLine1}, {facility.city}, {facility.state} {facility.postalCode}</span>
              </div>
            </div>

            {/* Image Gallery */}
            <div className="grid grid-cols-4 gap-3 h-[300px] sm:h-[400px]">
              <div className="col-span-4 sm:col-span-3 h-full rounded-2xl overflow-hidden relative group cursor-pointer">
                <img src={images[0]} alt="Main" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
              </div>
              <div className="hidden sm:flex flex-col gap-3 h-full col-span-1">
                {images.slice(1, 3).map((img: string, i: number) => (
                  <div key={i} className="flex-1 rounded-2xl overflow-hidden relative group cursor-pointer">
                    <img src={img} alt={`Gallery ${i}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    {i === 1 && images.length > 3 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">+{images.length - 3} photos</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* Description & Amenities */}
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900">About this spot</h3>
                <p className="text-slate-600 leading-relaxed text-sm sm:text-base whitespace-pre-wrap">
                  {facility.description || 'No description provided.'}
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Amenities</h3>
                {activeAmenities.length > 0 ? (
                  <ul className="space-y-3">
                    {activeAmenities.map(amenity => (
                      <li key={amenity} className="flex items-center gap-3 text-slate-700 font-medium">
                        <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        {amenity}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 text-sm">No amenities listed.</p>
                )}
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* Rules */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900">Things to know</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-amber-800 font-bold mb-3">
                  <Info className="w-5 h-5" /> Facility Rules
                </div>
                <ul className="list-disc list-inside space-y-2 text-amber-700 text-sm">
                  {facility.accessInstructions && <li>{facility.accessInstructions}</li>}
                  {facility.heightClearanceCm && <li>Height clearance is {facility.heightClearanceCm / 100} meters.</li>}
                  <li>Please park strictly within the marked white lines.</li>
                </ul>
              </div>
            </div>

          </div>

          {/* Right Column: Booking Widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white border border-slate-200 rounded-3xl p-6 shadow-xl shadow-slate-200/50">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <span className="text-3xl font-black text-slate-900">₹{pricePerHour}</span>
                  <span className="text-slate-500 font-medium"> / hour</span>
                </div>
              </div>

              {/* Time Picker */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-medium text-slate-900 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Arrive</label>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-medium text-slate-900 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Exit</label>
                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-medium text-slate-900 transition-all" />
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-slate-50 rounded-2xl p-4 mb-6 space-y-3">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>₹{pricePerHour} × 3 hours</span>
                  <span className="font-medium text-slate-900">₹{total}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Taxes & Fees</span>
                  <span className="font-medium text-slate-900">₹{Math.round(total * 0.18)}</span>
                </div>
                <hr className="border-slate-200" />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="text-xl font-black text-blue-600">₹{total + Math.round(total * 0.18)}</span>
                </div>
              </div>

              <Link to={`/checkout/${id}`} className="block">
                <Button size="lg" className="w-full text-lg shadow-blue-600/25 shadow-lg">
                  Book Now
                </Button>
              </Link>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
                <ShieldCheck className="w-4 h-4 text-green-500" /> Guaranteed Spot • Free Cancellation
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
