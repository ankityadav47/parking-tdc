import React, { useState } from 'react';
import { useParams, useNavigate, Link, useLocation, Navigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, CheckCircle2, CarFront } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { api } from '../api';

const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function CheckoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  
  const state = location.state as {
    date: string;
    startTime: string;
    endTime: string;
    total: number;
    pricePerHour: number;
    facility: any;
    hours: number;
  };

  const [licensePlate, setLicensePlate] = useState('');
  const [stateRegion, setStateRegion] = useState('KA');

  if (!state) {
    return <Navigate to={`/facilities/${id}`} replace />;
  }

  const { date, startTime, endTime, total, facility, hours } = state;
  const taxes = Math.round(total * 0.18);
  const finalAmount = total + taxes;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // validate vehicle form
    if (!licensePlate.trim()) {
      alert('Please enter your license plate.');
      return;
    }

    setLoading(true);
    
    try {
      const resLoaded = await loadRazorpay();
      if (!resLoaded) {
        alert('Razorpay SDK failed to load. Are you online?');
        setLoading(false);
        return;
      }

      // 1. Create or find vehicle, get vehicleId
      let vehicleId: string | undefined;
      try {
        const vehicleRes = await api.post('/users/me/vehicles', {
          licensePlate: licensePlate.trim().toUpperCase(),
          state: stateRegion,
        });
        vehicleId = vehicleRes.data.data?.id;
      } catch (vehicleErr: any) {
        // If vehicle already exists (409 conflict), try to find it from the user's list
        if (vehicleErr?.response?.status === 409 || vehicleErr?.response?.data?.statusCode === 409) {
          try {
            const vehiclesRes = await api.get('/users/me/vehicles');
            const existing = vehiclesRes.data.data?.find(
              (v: any) => v.licensePlate?.toUpperCase() === licensePlate.trim().toUpperCase()
            );
            vehicleId = existing?.id;
          } catch { /* no-op, proceed without vehicleId */ }
        }
        // Otherwise continue without vehicleId
      }

      // 2. Create Booking
      const startObj = new Date(`${date}T${startTime}:00`);
      const endObj = new Date(`${date}T${endTime}:00`);
      if (endObj <= startObj) {
        endObj.setDate(endObj.getDate() + 1);
      }
      
      const startIso = startObj.toISOString();
      const endIso = endObj.toISOString();
      
      const bookingRes = await api.post('/bookings', {
        facilityId: id,
        start: startIso,
        end: endIso,
        ...(vehicleId && { vehicleId }),
      });
      const reservation = bookingRes.data.data;

      // 2. Create Razorpay Order
      const orderRes = await api.post(`/payments/reservations/${reservation.id}/order`);
      const { orderId, amount, currency, keyId } = orderRes.data.data;

      // 3. Open Razorpay Checkout
      const options = {
        key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amount.toString(),
        currency: currency,
        name: 'ParkSpot',
        description: `Parking at ${facility.name}`,
        order_id: orderId,
        handler: async function (response: any) {
          try {
            // 4. Verify Payment
            await api.post('/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            navigate(`/reservations/${reservation.id}`);
          } catch (err) {
            console.error('Payment verification failed', err);
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: 'Demo User',
          email: 'demo@example.com',
          contact: '9999999999'
        },
        theme: {
          color: '#2563eb'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error(response.error);
        alert(response.error.description);
      });
      rzp.open();

    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || 'Something went wrong while initiating payment.');
    } finally {
      setLoading(false);
    }
  };

  const inp = "w-full px-4 py-3 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-medium text-slate-900 transition-all";

  const imgUrl = facility?.photos?.length > 0 
    ? facility.photos[0].url
    : 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=200&q=80';

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <Link to={`/facilities/${id}`} className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Facility
        </Link>

        <h1 className="text-3xl font-black text-slate-900 mb-8">Secure Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left: Payment Form */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <CarFront className="w-5 h-5 text-blue-600" /> Vehicle Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">License Plate</label>
                  <input type="text" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} placeholder="KA 01 AB 1234" className={inp} required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">State/Region</label>
                  <select className={inp} value={stateRegion} onChange={e => setStateRegion(e.target.value)}>
                    <option value="KA">Karnataka (KA)</option>
                    <option value="MH">Maharashtra (MH)</option>
                    <option value="DL">Delhi (DL)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Pay with Razorpay
              </h2>
              <p className="text-sm text-slate-600">You will be redirected to Razorpay's secure checkout to complete your payment via UPI, Credit/Debit Card, or Netbanking.</p>
              <Button onClick={handlePay} isLoading={loading} className="w-full" size="lg">
                Pay ₹{finalAmount.toFixed(0)}
              </Button>
            </div>
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm sticky top-24">
              <h3 className="font-bold text-lg text-slate-900 mb-4">Reservation Summary</h3>
              
              <div className="flex gap-4 mb-6">
                <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={imgUrl} alt="Facility" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 leading-tight mb-1">{facility?.name}</div>
                  <div className="text-sm text-slate-500">{facility?.addressLine1}, {facility?.city}</div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <div className="text-slate-500 text-sm">Arrive</div>
                  <div className="font-medium text-slate-900 text-right">
                    <div>{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    <div className="text-sm">{new Date(`2000-01-01T${startTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="text-slate-500 text-sm">Exit</div>
                  <div className="font-medium text-slate-900 text-right">
                    <div>{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    <div className="text-sm">{new Date(`2000-01-01T${endTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 mb-6 space-y-3">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Parking Fee ({hours.toFixed(1)} hrs)</span>
                  <span className="font-medium text-slate-900">₹{total.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Taxes & Fees</span>
                  <span className="font-medium text-slate-900">₹{taxes.toFixed(0)}</span>
                </div>
                <hr className="border-slate-200" />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total Due</span>
                  <span className="text-2xl font-black text-blue-600">₹{finalAmount.toFixed(0)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <p>Free cancellation up to 1 hour before arrival.</p>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-600">
                  <ShieldCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <p>Payments are 256-bit encrypted and completely secure.</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
