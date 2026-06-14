import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, ShieldCheck, CheckCircle2, CarFront } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function CheckoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('card');

  // Hardcoded for demo
  const amount = 319; // 270 + 49 tax

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate Razorpay / API call
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    navigate('/reservations/DEMO-RES-123');
  };

  const inp = "w-full px-4 py-3 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-medium text-slate-900 transition-all";

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
                  <input type="text" placeholder="KA 01 AB 1234" className={inp} required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">State/Region</label>
                  <select className={inp} defaultValue="KA">
                    <option value="KA">Karnataka (KA)</option>
                    <option value="MH">Maharashtra (MH)</option>
                    <option value="DL">Delhi (DL)</option>
                  </select>
                </div>
              </div>
            </div>

            <form onSubmit={handlePay} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" /> Payment Method
              </h2>

              <div className="flex gap-4">
                <label className={`flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-colors ${paymentMethod === 'card' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  <input type="radio" name="pay" value="card" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} className="sr-only" />
                  <CreditCard className="w-6 h-6 mb-2" />
                  <span className="font-bold text-sm">Card</span>
                </label>
                <label className={`flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-colors ${paymentMethod === 'upi' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  <input type="radio" name="pay" value="upi" checked={paymentMethod === 'upi'} onChange={() => setPaymentMethod('upi')} className="sr-only" />
                  <span className="font-black text-lg mb-1 leading-none tracking-tighter">UPI</span>
                  <span className="font-bold text-sm">GPay / PhonePe</span>
                </label>
              </div>

              {paymentMethod === 'card' && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Card Number</label>
                    <input type="text" placeholder="0000 0000 0000 0000" className={inp} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Expiry (MM/YY)</label>
                      <input type="text" placeholder="12/26" className={inp} required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">CVC</label>
                      <input type="password" placeholder="123" className={inp} maxLength={4} required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Name on Card</label>
                    <input type="text" placeholder="John Doe" className={inp} required />
                  </div>
                </div>
              )}

              {paymentMethod === 'upi' && (
                <div className="pt-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">UPI ID</label>
                  <input type="text" placeholder="username@okhdfcbank" className={inp} required />
                </div>
              )}

              <Button type="submit" isLoading={loading} className="w-full" size="lg">
                Pay ₹{amount}
              </Button>
            </form>
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm sticky top-24">
              <h3 className="font-bold text-lg text-slate-900 mb-4">Reservation Summary</h3>
              
              <div className="flex gap-4 mb-6">
                <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                  <img src="https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=200&q=80" alt="Facility" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 leading-tight mb-1">MG Road Premium Covered Parking</div>
                  <div className="text-sm text-slate-500">12 MG Road, Bangalore</div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <div className="text-slate-500 text-sm">Arrive</div>
                  <div className="font-medium text-slate-900 text-right">
                    <div>Jun 12, 2026</div>
                    <div className="text-sm">2:00 PM</div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="text-slate-500 text-sm">Exit</div>
                  <div className="font-medium text-slate-900 text-right">
                    <div>Jun 12, 2026</div>
                    <div className="text-sm">5:00 PM</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 mb-6 space-y-3">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Parking Fee (3 hrs)</span>
                  <span className="font-medium text-slate-900">₹270</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Taxes & Fees</span>
                  <span className="font-medium text-slate-900">₹49</span>
                </div>
                <hr className="border-slate-200" />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total Due</span>
                  <span className="text-2xl font-black text-blue-600">₹{amount}</span>
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
