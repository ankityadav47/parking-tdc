import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, MapPin, Users, Star, Clock, CheckCircle,
  XCircle, Zap, Accessibility, ShieldCheck, Car, Building2,
  Camera, DollarSign, CalendarClock,
} from 'lucide-react';
import { operatorApi } from '../api/operator';

const STATUS_CONFIG: Record<string, { label: string; style: string; icon: React.ReactNode }> = {
  active:         { label: 'Active',          style: 'bg-green-50 text-green-700 border-green-200',   icon: <CheckCircle className="w-4 h-4" /> },
  pending_review: { label: 'Pending Review',  style: 'bg-amber-50 text-amber-700 border-amber-200',   icon: <Clock className="w-4 h-4" /> },
  rejected:       { label: 'Rejected',        style: 'bg-red-50 text-red-600 border-red-200',         icon: <XCircle className="w-4 h-4" /> },
  draft:          { label: 'Draft',           style: 'bg-slate-100 text-slate-600 border-slate-200',  icon: <Edit2 className="w-4 h-4" /> },
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 font-medium">{label}</span>
      <span className="text-sm text-slate-900 font-semibold text-right">{value}</span>
    </div>
  );
}

function AmenityBadge({ active, icon, label }: { active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
      active ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-400'
    }`}>
      {icon}
      {label}
    </div>
  );
}

export default function FacilityViewPage() {
  const { id } = useParams<{ id: string }>();

  const { data: facility, isLoading, error } = useQuery({
    queryKey: ['operator-facility', id],
    queryFn: () => operatorApi.getFacility(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-xl" />
        <div className="h-48 bg-slate-100 rounded-2xl" />
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (error || !facility) {
    return (
      <div className="p-8 text-center">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-lg">Failed to Load Facility</h3>
        <p className="text-slate-500 text-sm mt-1 mb-4">{(error as any)?.message || 'Facility not found'}</p>
        <Link to="/facilities" className="text-blue-600 text-sm font-medium hover:underline">← Back to Facilities</Link>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[facility.status] || STATUS_CONFIG.draft;
  const amenities = facility.amenities || {};
  const photos: any[] = facility.photos || [];
  const rateRules: any[] = facility.rateRules || [];
  const hourlyRule = rateRules.find((r: any) => r.rateType === 'hourly');
  const dailyRule  = rateRules.find((r: any) => r.rateType === 'daily');

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/facilities"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">{facility.name}</h1>
            <div className="flex items-center gap-1 text-slate-500 text-sm mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>{facility.addressLine1}, {facility.city}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full border ${cfg.style}`}>
            {cfg.icon} {cfg.label}
          </span>
          <Link
            to={`/facilities/${id}/edit`}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl text-sm transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </Link>
        </div>
      </div>

      {/* Photos */}
      {photos.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-700" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4 text-slate-700">
              <Camera className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-base">Photos</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo: any, i: number) => (
                <div key={photo.id || i} className="relative rounded-xl overflow-hidden aspect-video border border-slate-100">
                  <img src={photo.url} alt={`Facility photo ${i + 1}`} className="w-full h-full object-cover" />
                  {photo.isCover && (
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-slate-900/80 text-white text-[10px] font-bold rounded uppercase tracking-wide">
                      Cover
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Capacity', value: facility.totalCapacity ?? '—', icon: <Users className="w-5 h-5 text-blue-600" /> },
          { label: 'Active Now',     value: facility._count?.reservations ?? 0, icon: <Car className="w-5 h-5 text-green-600" /> },
          { label: 'Avg Rating',     value: facility.avgRating ? `${facility.avgRating} ★` : '—', icon: <Star className="w-5 h-5 text-amber-500" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
            <div className="flex justify-center mb-1">{icon}</div>
            <div className="text-2xl font-black text-slate-900">{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Details */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-700" />
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4 text-slate-700">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-base">Facility Details</h2>
          </div>
          <InfoRow label="Type"        value={<span className="capitalize">{facility.type || '—'}</span>} />
          <InfoRow label="Address"     value={facility.addressLine1 || '—'} />
          <InfoRow label="City"        value={facility.city || '—'} />
          <InfoRow label="State"       value={facility.state || '—'} />
          <InfoRow label="Postal Code" value={facility.postalCode || '—'} />
          <InfoRow label="Country"     value={facility.country || '—'} />
          <InfoRow label="Timezone"    value={facility.timezone || '—'} />
          <InfoRow label="Coordinates" value={
            facility.lat && facility.lng
              ? <span className="font-mono text-xs">{Number(facility.lat).toFixed(5)}, {Number(facility.lng).toFixed(5)}</span>
              : '—'
          } />
          {facility.description && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium mb-1">Description</p>
              <p className="text-sm text-slate-700">{facility.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-600" />
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4 text-slate-700">
            <DollarSign className="w-4 h-4 text-green-600" />
            <h2 className="font-bold text-base">Pricing</h2>
          </div>
          {rateRules.length === 0 ? (
            <p className="text-sm text-slate-400">No rate rules configured.</p>
          ) : (
            <div className="space-y-2">
              {hourlyRule && (
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl border border-green-100">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <CalendarClock className="w-4 h-4 text-green-600" /> Hourly Rate
                  </div>
                  <span className="font-black text-slate-900">₹{(hourlyRule.priceCents / 100).toFixed(0)}/hr</span>
                </div>
              )}
              {dailyRule && (
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <CalendarClock className="w-4 h-4 text-blue-600" /> Daily Rate
                  </div>
                  <span className="font-black text-slate-900">₹{(dailyRule.priceCents / 100).toFixed(0)}/day</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Amenities */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-600" />
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4 text-slate-700">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <h2 className="font-bold text-base">Amenities</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <AmenityBadge active={!!amenities.covered}       icon={<Building2 className="w-4 h-4" />}      label="Covered" />
            <AmenityBadge active={!!amenities.evCharging}    icon={<Zap className="w-4 h-4" />}            label="EV Charging" />
            <AmenityBadge active={!!amenities.adaAccessible} icon={<Accessibility className="w-4 h-4" />}  label="ADA Accessible" />
            <AmenityBadge active={!!amenities.valet}         icon={<Car className="w-4 h-4" />}            label="Valet" />
            <AmenityBadge active={!!amenities.gated}         icon={<ShieldCheck className="w-4 h-4" />}    label="Gated" />
          </div>
        </div>
      </div>
    </div>
  );
}
