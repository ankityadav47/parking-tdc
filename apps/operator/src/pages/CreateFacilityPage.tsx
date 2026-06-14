import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check, Building2, MapPin, DollarSign, Settings } from 'lucide-react';
import LocationPicker, { PickedLocation } from '../components/LocationPicker';
import { operatorApi } from '../api/operator';

const STEPS = ['Basic Info', 'Location', 'Pricing', 'Amenities & Submit'];

type FormData = {
  name: string; description: string; type: string; totalCapacity: string;
  hourlyRate: string; dailyRate: string; currency: string;
  covered: boolean; evCharging: boolean; adaAccessible: boolean; valet: boolean; gated: boolean;
};

const INITIAL: FormData = {
  name: '', description: '', type: 'garage', totalCapacity: '',
  hourlyRate: '', dailyRate: '', currency: 'INR',
  covered: false, evCharging: false, adaAccessible: false, valet: false, gated: false,
};

// Detect timezone of browser
const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
              i < current ? 'bg-blue-600 border-blue-600 text-white'
              : i === current ? 'border-blue-600 text-blue-600'
              : 'border-slate-200 text-slate-400'
            }`}>
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-sm font-medium hidden sm:block ${i === current ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < current ? 'bg-blue-600' : 'bg-slate-200'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

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

const inp = "w-full px-4 py-3 border border-slate-300 rounded-xl outline-none text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all";
const sel = "w-full px-4 py-3 border border-slate-300 rounded-xl outline-none text-slate-900 focus:ring-2 focus:ring-blue-600 bg-white";

export default function CreateFacilityPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const set = (k: keyof FormData, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  const canProceed = () => {
    if (step === 0) return form.name.trim() && form.totalCapacity;
    if (step === 1) return !!location;
    if (step === 2) return !!form.hourlyRate;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // 1. Create the base facility
      const facilityRes = await operatorApi.createFacility({
        name: form.name,
        description: form.description || '',
        type: form.type,
        totalCapacity: parseInt(form.totalCapacity, 10) || 1,
        addressLine1: location!.addressLine1 || 'Unknown',
        city: location!.city || 'Unknown',
        state: location!.state || 'Unknown',
        postalCode: location!.postalCode || '000000',
        country: location!.country || 'IN',
        timezone: browserTimezone,
        lat: location!.lat,
        lng: location!.lng,
      });
      
      const facilityId = facilityRes.id;

      // 2. Add pricing (rate rules)
      if (form.hourlyRate) {
        await operatorApi.addRateRule(facilityId, {
          rateType: 'hourly',
          priceCents: parseInt(form.hourlyRate, 10) * 100,
          priority: 1
        });
      }
      if (form.dailyRate) {
        await operatorApi.addRateRule(facilityId, {
          rateType: 'daily',
          priceCents: parseInt(form.dailyRate, 10) * 100,
          priority: 2,
          minMinutes: 300
        });
      }

      // 3. Update amenities
      await operatorApi.updateAmenities(facilityId, {
        covered: form.covered,
        evCharging: form.evCharging,
        adaAccessible: form.adaAccessible,
        valet: form.valet,
        gated: form.gated,
      });

      // 4. Submit for review
      await operatorApi.submitForReview(facilityId);

      navigate('/facilities');
    } catch (err) {
      console.error('Submission failed', err);
      alert('Failed to submit facility. Please check the console.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Add New Facility</h1>
        <p className="text-slate-500 text-sm mt-1">Complete all steps to submit your facility for review.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8">
        <StepIndicator current={step} />

        {/* Step 0: Basic Info */}
        {step === 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-6 text-blue-600">
              <Building2 className="w-5 h-5" />
              <h2 className="font-bold text-lg text-slate-900">Basic Information</h2>
            </div>
            <Field label="Facility Name" required>
              <input className={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. MG Road Covered Parking" />
            </Field>
            <Field label="Description">
              <textarea className={inp + ' resize-none'} rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe your facility..." />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type" required>
                <select className={sel} value={form.type} onChange={e => set('type', e.target.value)}>
                  <option value="garage">Covered Garage</option>
                  <option value="lot">Open Lot</option>
                  <option value="street">Street Parking</option>
                  <option value="valet">Valet</option>
                </select>
              </Field>
              <Field label="Total Capacity" required>
                <input className={inp} type="number" min="1" value={form.totalCapacity} onChange={e => set('totalCapacity', e.target.value)} placeholder="e.g. 80" />
              </Field>
            </div>
          </div>
        )}

        {/* Step 1: Location with Google Maps Picker */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4 text-blue-600">
              <MapPin className="w-5 h-5" />
              <h2 className="font-bold text-lg text-slate-900">Pin Your Exact Location</h2>
            </div>
            <p className="text-sm text-slate-500 -mt-2 mb-4">
              Search for your address, then click or drag the pin to the exact entrance of your facility.
            </p>

            <LocationPicker value={location} onChange={setLocation} />

            {location && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <Field label="Street Address">
                  <input className={inp} value={location.addressLine1} onChange={e => setLocation(l => l ? { ...l, addressLine1: e.target.value } : l)} />
                </Field>
                <Field label="City">
                  <input className={inp} value={location.city} onChange={e => setLocation(l => l ? { ...l, city: e.target.value } : l)} />
                </Field>
                <Field label="State">
                  <input className={inp} value={location.state} onChange={e => setLocation(l => l ? { ...l, state: e.target.value } : l)} />
                </Field>
                <Field label="Postal Code">
                  <input className={inp} value={location.postalCode} onChange={e => setLocation(l => l ? { ...l, postalCode: e.target.value } : l)} />
                </Field>
              </div>
            )}

            {!location && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                ⚠️ Please pick a location on the map to proceed.
              </div>
            )}
          </div>
        )}

        {/* Step 2: Pricing */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-6 text-blue-600">
              <DollarSign className="w-5 h-5" />
              <h2 className="font-bold text-lg text-slate-900">Pricing</h2>
            </div>
            <Field label="Currency">
              <select className={sel} value={form.currency} onChange={e => set('currency', e.target.value)}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Hourly Rate" required>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input className={inp + ' pl-8'} type="number" min="0" value={form.hourlyRate} onChange={e => set('hourlyRate', e.target.value)} placeholder="90" />
                </div>
              </Field>
              <Field label="Daily Rate (optional)">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input className={inp + ' pl-8'} type="number" min="0" value={form.dailyRate} onChange={e => set('dailyRate', e.target.value)} placeholder="600" />
                </div>
              </Field>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
              💡 Advanced rate rules (peak hours, weekends) can be added after approval.
            </div>
          </div>
        )}

        {/* Step 3: Amenities + Review */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-6 text-blue-600">
              <Settings className="w-5 h-5" />
              <h2 className="font-bold text-lg text-slate-900">Amenities & Submit</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([['covered', 'Covered'], ['evCharging', 'EV Charging'], ['adaAccessible', 'ADA Accessible'], ['valet', 'Valet'], ['gated', 'Gated']] as [keyof FormData, string][]).map(([k, label]) => (
                <label key={k} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${form[k] ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="checkbox" className="sr-only" checked={!!form[k]} onChange={e => set(k, e.target.checked)} />
                  <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 ${form[k] ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                    {form[k] && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm font-medium text-slate-900">{label}</span>
                </label>
              ))}
            </div>

            <div className="border border-slate-200 rounded-xl p-4 space-y-2 text-sm mt-2">
              <h3 className="font-bold text-slate-900 mb-3">Review Summary</h3>
              <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-medium">{form.name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-medium capitalize">{form.type}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Capacity</span><span className="font-medium">{form.totalCapacity || '—'} spots</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Address</span><span className="font-medium">{location?.addressLine1 || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">City</span><span className="font-medium">{location?.city || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Coordinates</span>
                <span className="font-mono text-xs">{location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : '—'}</span>
              </div>
              <div className="flex justify-between"><span className="text-slate-500">Hourly Rate</span><span className="font-medium">₹{form.hourlyRate || '—'}</span></div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
              ✅ Your facility will be submitted for admin review (24–48 hrs).
            </div>
          </div>
        )}

        {/* Nav Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/facilities')}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> {step === 0 ? 'Cancel' : 'Back'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-colors"
            >
              {submitting ? 'Submitting...' : <><Check className="w-4 h-4" /> Submit for Review</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
