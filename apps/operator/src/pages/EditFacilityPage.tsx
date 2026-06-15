import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Building2, MapPin, DollarSign, Settings,
  Check, XCircle, Loader2, Camera, Trash2, Upload, Star,
} from 'lucide-react';
import { operatorApi } from '../api/operator';

const inp = 'w-full px-4 py-3 border border-slate-300 rounded-xl outline-none text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all';
const sel = 'w-full px-4 py-3 border border-slate-300 rounded-xl outline-none text-slate-900 focus:ring-2 focus:ring-blue-600 bg-white';

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
      <span className="text-blue-600">{icon}</span>
      <h2 className="font-bold text-base text-slate-900">{title}</h2>
    </div>
  );
}

export default function EditFacilityPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: facility, isLoading, error } = useQuery({
    queryKey: ['operator-facility', id],
    queryFn: () => operatorApi.getFacility(id!),
    enabled: !!id,
  });

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('garage');
  const [totalCapacity, setTotalCap] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [dailyRate, setDailyRate] = useState('');

  // Amenities
  const [covered, setCovered] = useState(false);
  const [evCharging, setEvCharging] = useState(false);
  const [adaAccessible, setAdaAccessible] = useState(false);
  const [valet, setValet] = useState(false);
  const [gated, setGated] = useState(false);

  const [saved, setSaved] = useState(false);

  // Photo state
  const [existingPhotos, setExistingPhotos] = useState<any[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Pre-fill once facility loads
  useEffect(() => {
    if (!facility) return;
    setName(facility.name || '');
    setDescription(facility.description || '');
    setType(facility.type || 'garage');
    setTotalCap(String(facility.totalCapacity || ''));

    const rules: any[] = facility.rateRules || [];
    const hourly = rules.find((r: any) => r.rateType === 'hourly');
    const daily = rules.find((r: any) => r.rateType === 'daily');
    if (hourly) setHourlyRate(String(Math.round(hourly.priceCents / 100)));
    if (daily) setDailyRate(String(Math.round(daily.priceCents / 100)));

    const am = facility.amenities || {};
    setCovered(!!am.covered);
    setEvCharging(!!am.evCharging);
    setAdaAccessible(!!am.adaAccessible);
    setValet(!!am.valet);
    setGated(!!am.gated);
    setExistingPhotos(facility.photos || []);
  }, [facility]);

  const mutation = useMutation({
    mutationFn: async () => {
      // 1. Update basic facility info
      await operatorApi.updateFacility(id!, {
        name,
        description,
        type,
        totalCapacity: parseInt(totalCapacity, 10) || 1,
      });

      // 2. Update amenities
      await operatorApi.updateAmenities(id!, { covered, evCharging, adaAccessible, valet, gated });

      // 3. Update rate rules if hourly rate provided
      const rules: any[] = facility?.rateRules || [];
      const hourlyRule = rules.find((r: any) => r.rateType === 'hourly');
      const dailyRule = rules.find((r: any) => r.rateType === 'daily');

      if (hourlyRate) {
        const priceCents = parseInt(hourlyRate, 10) * 100;
        if (hourlyRule) {
          await operatorApi.updateRateRule(hourlyRule.id, { priceCents });
        } else {
          await operatorApi.addRateRule(id!, { rateType: 'hourly', priceCents, priority: 1 });
        }
      }
      if (dailyRate) {
        const priceCents = parseInt(dailyRate, 10) * 100;
        if (dailyRule) {
          await operatorApi.updateRateRule(dailyRule.id, { priceCents });
        } else {
          await operatorApi.addRateRule(id!, { rateType: 'daily', priceCents, priority: 2, minMinutes: 300 });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-facility', id] });
      queryClient.invalidateQueries({ queryKey: ['operator-facilities'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  // Upload new photos individually
  const handleUploadPhotos = async () => {
    if (!newFiles.length) return;
    setUploading(true);
    try {
      const uploaded: any[] = [];
      for (const file of newFiles) {
        const photo = await operatorApi.uploadPhoto(id!, file);
        uploaded.push(photo);
      }
      setExistingPhotos(prev => [...prev, ...uploaded]);
      setNewFiles([]);
      queryClient.invalidateQueries({ queryKey: ['operator-facility', id] });
    } catch (err) {
      alert('Failed to upload some photos. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Delete an existing photo
  const handleDeletePhoto = async (photoId: string) => {
    setDeletingPhotoId(photoId);
    try {
      await operatorApi.deletePhoto(id!, photoId);
      setExistingPhotos(prev => prev.filter(p => p.id !== photoId));
      queryClient.invalidateQueries({ queryKey: ['operator-facility', id] });
    } catch (err) {
      alert('Failed to delete photo.');
    } finally {
      setDeletingPhotoId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse max-w-2xl">
        <div className="h-8 w-48 bg-slate-200 rounded-xl" />
        <div className="h-64 bg-slate-100 rounded-2xl" />
        <div className="h-48 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (error || !facility) {
    return (
      <div className="p-8 text-center">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-lg">Facility Not Found</h3>
        <Link to="/facilities" className="text-blue-600 text-sm font-medium hover:underline mt-2 inline-block">← Back to Facilities</Link>
      </div>
    );
  }

  const amenityList: { key: string; label: string; value: boolean; setter: (v: boolean) => void }[] = [
    { key: 'covered', label: 'Covered', value: covered, setter: setCovered },
    { key: 'evCharging', label: 'EV Charging', value: evCharging, setter: setEvCharging },
    { key: 'adaAccessible', label: 'ADA Accessible', value: adaAccessible, setter: setAdaAccessible },
    { key: 'valet', label: 'Valet', value: valet, setter: setValet },
    { key: 'gated', label: 'Gated', value: gated, setter: setGated },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/facilities/${id}`}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Edit Facility</h1>
            <p className="text-slate-500 text-sm mt-0.5">{facility.name}</p>
          </div>
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !name.trim() || !totalCapacity}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors shadow-sm"
        >
          {mutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : saved ? (
            <><Check className="w-4 h-4" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save Changes</>
          )}
        </button>
      </div>

      {mutation.isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          ❌ {(mutation.error as any)?.response?.data?.message || (mutation.error as any)?.message || 'Failed to save changes.'}
        </div>
      )}

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
          ✅ Facility updated successfully!
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-700" />
        <div className="p-6">
          <SectionHeader icon={<Building2 className="w-4 h-4" />} title="Basic Information" />
          <div className="space-y-4">
            <Field label="Facility Name" required>
              <input className={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. MG Road Covered Parking" />
            </Field>
            <Field label="Description">
              <textarea className={inp + ' resize-none'} rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your facility..." />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type" required>
                <select className={sel} value={type} onChange={e => setType(e.target.value)}>
                  <option value="garage">Covered Garage</option>
                  <option value="lot">Open Lot</option>
                  <option value="street">Street Parking</option>
                  <option value="valet">Valet</option>
                </select>
              </Field>
              <Field label="Total Capacity" required>
                <input className={inp} type="number" min="1" value={totalCapacity} onChange={e => setTotalCap(e.target.value)} placeholder="e.g. 80" />
              </Field>
            </div>
          </div>
        </div>
      </div>

      {/* Location (read-only — show current, direct to re-submit for location changes) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-slate-400 to-slate-500" />
        <div className="p-6">
          <SectionHeader icon={<MapPin className="w-4 h-4" />} title="Location (Read-only)" />
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['Street Address', facility.addressLine1],
              ['City', facility.city],
              ['State', facility.state],
              ['Postal Code', facility.postalCode],
              ['Country', facility.country],
              ['Coordinates', facility.lat && facility.lng ? `${Number(facility.lat).toFixed(5)}, ${Number(facility.lng).toFixed(5)}` : '—'],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
                <p className="text-slate-800 font-semibold">{val || '—'}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            ⚠️ Location changes require creating a new facility submission. Contact support to update the address.
          </p>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-600" />
        <div className="p-6">
          <SectionHeader icon={<DollarSign className="w-4 h-4" />} title="Pricing" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Hourly Rate (₹)" required>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                <input className={inp + ' pl-8'} type="number" min="0" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="90" />
              </div>
            </Field>
            <Field label="Daily Rate (₹, optional)">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                <input className={inp + ' pl-8'} type="number" min="0" value={dailyRate} onChange={e => setDailyRate(e.target.value)} placeholder="600" />
              </div>
            </Field>
          </div>
        </div>
      </div>

      {/* Photos Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-orange-500 to-pink-500" />
        <div className="p-6">
          <SectionHeader icon={<Camera className="w-4 h-4" />} title="Photos" />

          {/* Existing photos */}
          {existingPhotos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {existingPhotos.map((photo: any, i: number) => (
                <div key={photo.id} className="relative rounded-xl overflow-hidden aspect-video border border-slate-200 group">
                  <img src={photo.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  {photo.isCover && (
                    <span className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-slate-900/80 text-white text-[10px] font-bold rounded uppercase tracking-wide">
                      <Star className="w-2.5 h-2.5" /> Cover
                    </span>
                  )}
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    disabled={deletingPhotoId === photo.id}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-red-50 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm disabled:opacity-50"
                    title="Delete photo"
                  >
                    {deletingPhotoId === photo.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}

          {existingPhotos.length === 0 && newFiles.length === 0 && (
            <p className="text-sm text-slate-400 mb-4">No photos uploaded yet.</p>
          )}

          {/* New files preview */}
          {newFiles.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {newFiles.map((file, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden aspect-video border-2 border-dashed border-blue-300 group">
                  <img src={URL.createObjectURL(file)} alt={`New ${i}`} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded uppercase tracking-wide">New</span>
                  <button
                    onClick={() => setNewFiles(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-red-50 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload controls — same dropzone as CreateFacilityPage */}
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
            <input
              id="facility-photo-upload"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={e => {
                if (e.target.files) {
                  setNewFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                  e.target.value = '';
                }
              }}
            />
            <div className="flex flex-col items-center gap-3 pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Click or drag images here</p>
                <p className="text-xs text-slate-500 mt-1">JPEG, PNG, WEBP (Max 5MB each)</p>
              </div>
            </div>
          </div>

          {newFiles.length > 0 && (
            <button
              onClick={handleUploadPhotos}
              disabled={uploading}
              className="mt-3 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors"
            >
              {uploading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                : <><Upload className="w-4 h-4" /> Upload {newFiles.length} photo{newFiles.length > 1 ? 's' : ''}</>
              }
            </button>
          )}
          <p className="text-xs text-slate-400 mt-1">First uploaded photo becomes the cover.</p>
        </div>
      </div>

      {/* Amenities */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-600" />
        <div className="p-6">
          <SectionHeader icon={<Settings className="w-4 h-4" />} title="Amenities" />
          <div className="grid grid-cols-2 gap-3">
            {amenityList.map(({ key, label, value, setter }) => (
              <label
                key={key}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
              >
                <input type="checkbox" className="sr-only" checked={value} onChange={e => setter(e.target.checked)} />
                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${value ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                  }`}>
                  {value && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm font-medium text-slate-900">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Save */}
      <div className="flex justify-end pb-6">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !name.trim() || !totalCapacity}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-xl text-sm transition-colors shadow-sm"
        >
          {mutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : (
            <><Save className="w-4 h-4" /> Save Changes</>
          )}
        </button>
      </div>
    </div>
  );
}
