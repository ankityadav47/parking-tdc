import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, QrCode, MapPin, Calendar, Clock, CarFront, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function ConfirmationPage() {
  const { id } = useParams(); // Should be DEMO-RES-123

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12 flex flex-col items-center">
      <div className="w-full max-w-2xl px-4 sm:px-6">
        
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Booking Confirmed!</h1>
          <p className="text-slate-600">
            Your parking spot is guaranteed. A confirmation email has been sent.
          </p>
        </div>

        {/* Digital Pass (QR) */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mb-6 relative">
          {/* Ticket styling cutouts */}
          <div className="absolute top-[180px] -left-4 w-8 h-8 bg-slate-50 rounded-full border-r border-slate-200 z-10"></div>
          <div className="absolute top-[180px] -right-4 w-8 h-8 bg-slate-50 rounded-full border-l border-slate-200 z-10"></div>
          <div className="absolute top-[196px] left-4 right-4 border-t-2 border-dashed border-slate-200"></div>

          {/* Top section: QR */}
          <div className="p-8 pb-10 text-center bg-gradient-to-b from-blue-50 to-white">
            <div className="inline-block p-4 bg-white rounded-2xl shadow-sm border border-slate-100 mb-4">
              <QrCode className="w-32 h-32 text-slate-900" />
            </div>
            <div className="font-mono text-lg font-bold text-slate-700 tracking-widest">{id}</div>
            <div className="text-sm text-slate-500 mt-1">Scan at entrance</div>
          </div>

          {/* Bottom section: Details */}
          <div className="p-8 pt-10">
            <h2 className="font-bold text-xl text-slate-900 mb-1">MG Road Premium Covered Parking</h2>
            <p className="text-slate-500 text-sm mb-6 flex items-center gap-1">
              <MapPin className="w-4 h-4" /> 12 MG Road, Bangalore
            </p>

            <div className="grid grid-cols-2 gap-y-6">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Arrive
                </div>
                <div className="font-semibold text-slate-900">Jun 12, 2026</div>
                <div className="text-sm text-slate-600">2:00 PM</div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Exit
                </div>
                <div className="font-semibold text-slate-900">Jun 12, 2026</div>
                <div className="text-sm text-slate-600">5:00 PM</div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <CarFront className="w-3.5 h-3.5" /> Vehicle
                </div>
                <div className="font-semibold text-slate-900">KA 01 AB 1234</div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Payment</div>
                <div className="font-semibold text-slate-900">₹319.00</div>
                <div className="text-sm text-slate-600">Paid via Card</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" className="flex-1 bg-white">Get Directions</Button>
          <Link to="/dashboard" className="flex-1">
            <Button className="w-full">View My Bookings <ChevronRight className="w-4 h-4 ml-1" /></Button>
          </Link>
        </div>

      </div>
    </div>
  );
}
