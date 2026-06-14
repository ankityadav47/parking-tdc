import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Search, MapPin, Calendar, Clock, CheckCircle, CarFront, Plane, Building2 } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [mapProvider, setMapProvider] = useState<'google' | 'openfreemap'>('google');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toTimeString().slice(0, 5);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 4, 0, 0, 0);
    return d.toISOString().split('T')[0];
  });
  const [endTime, setEndTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 4, 0, 0, 0);
    return d.toTimeString().slice(0, 5);
  });

  useEffect(() => {
    fetch('https://ghostwhite-badger-995775.hostingersite.com/api/v1/config')
      .then(r => r.json())
      .then(d => {
        if (d?.data?.mapProvider) setMapProvider(d.data.mapProvider);
      })
      .catch(e => console.error('Failed to load map config', e));
  }, []);

  useEffect(() => {
    if (!address || address.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        if (mapProvider === 'openfreemap') {
          const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=5`);
          const data = await res.json();
          setSuggestions(
            data.features.map((f: any) => ({
              id: f.properties.osm_id,
              name: f.properties.name || f.properties.street || address,
              description: [f.properties.city, f.properties.state, f.properties.country].filter(Boolean).join(', '),
            }))
          );
        } else {
          const res = await fetch(`https://ghostwhite-badger-995775.hostingersite.com/api/v1/search/autocomplete?q=${encodeURIComponent(address)}`);
          const data = await res.json();
          setSuggestions(
            data.data?.predictions?.map((p: any) => ({
              id: p.place_id,
              name: p.structured_formatting?.main_text || p.description,
              description: p.structured_formatting?.secondary_text || '',
            })) || []
          );
        }
      } catch (e) {
        console.error('Autocomplete error', e);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [address, mapProvider]);

  const handleSelectSuggestion = (s: any) => {
    const fullAddress = s.description ? `${s.name}, ${s.description}` : s.name;
    setAddress(fullAddress);
    setShowSuggestions(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    const startObj = new Date(`${startDate}T${startTime}:00`);
    const endObj = new Date(`${endDate}T${endTime}:00`);

    const searchParams = new URLSearchParams({
      address,
      start: startObj.toISOString(),
      end: endObj.toISOString(),
    });

    navigate(`/search?${searchParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left: Copy & Search */}
          <div className="space-y-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
              Parking made easy,<br />wherever you go
            </h1>

            {/* Search Widget */}
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 p-2 overflow-hidden">
              <div className="flex bg-slate-100 rounded-xl p-1 mb-4">
                <button className="flex-1 bg-white text-slate-900 font-semibold py-2 px-4 rounded-lg shadow-sm text-sm">Hourly</button>
                <button className="flex-1 text-slate-500 font-medium py-2 px-4 rounded-lg hover:text-slate-700 text-sm">Monthly</button>
              </div>

              <form onSubmit={handleSearch} className="space-y-3">
                <div className="relative z-50">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Where are you going?"
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-lg font-medium placeholder:text-slate-400 placeholder:font-normal"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-y-auto max-h-60">
                      {suggestions.map(s => (
                        <div
                          key={s.id}
                          className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                          onClick={() => handleSelectSuggestion(s)}
                        >
                          <div className="text-sm font-bold text-slate-900">{s.name}</div>
                          <div className="text-xs text-slate-500">{s.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="w-full pl-12 pr-4 py-2 bg-white border border-slate-300 rounded-xl flex flex-col justify-center">
                      <span className="text-xs text-slate-500 font-medium mb-0.5">Start Time</span>
                      <div className="flex gap-2">
                        <input 
                          type="date" 
                          className="text-sm font-semibold text-slate-900 bg-transparent outline-none w-full cursor-pointer"
                          value={startDate}
                          onChange={e => setStartDate(e.target.value)}
                        />
                        <input 
                          type="time" 
                          className="text-sm font-semibold text-slate-900 bg-transparent outline-none w-full cursor-pointer"
                          value={startTime}
                          onChange={e => setStartTime(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="w-full pl-12 pr-4 py-2 bg-white border border-slate-300 rounded-xl flex flex-col justify-center">
                      <span className="text-xs text-slate-500 font-medium mb-0.5">End Time</span>
                      <div className="flex gap-2">
                        <input 
                          type="date" 
                          className="text-sm font-semibold text-slate-900 bg-transparent outline-none w-full cursor-pointer"
                          value={endDate}
                          onChange={e => setEndDate(e.target.value)}
                        />
                        <input 
                          type="time" 
                          className="text-sm font-semibold text-slate-900 bg-transparent outline-none w-full cursor-pointer"
                          value={endTime}
                          onChange={e => setEndTime(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-colors shadow-lg shadow-blue-600/30 text-lg"
                >
                  Search ParkSpot
                </button>
              </form>
            </div>
          </div>

          {/* Right: Hero Image */}
          <div className="hidden lg:block relative rounded-3xl overflow-hidden shadow-2xl h-[500px]">
            <img
              src="/assets/hero_garage_woman.png"
              alt="Woman smiling in modern parking garage"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          </div>

        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-slate-50 py-20 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-16 text-slate-900">How ParkSpot Works</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 text-blue-600 shadow-sm border border-blue-200">
                <MapPin className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold mb-3">Look</h3>
              <p className="text-slate-600 leading-relaxed max-w-xs mx-auto">
                Search and compare prices at thousands of parking facilities across the city.
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 shadow-sm border border-green-200">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold mb-3">Book</h3>
              <p className="text-slate-600 leading-relaxed max-w-xs mx-auto">
                Pay securely in advance and receive a digital parking pass instantly.
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-6 text-amber-600 shadow-sm border border-amber-200">
                <CarFront className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold mb-3">Park</h3>
              <p className="text-slate-600 leading-relaxed max-w-xs mx-auto">
                Drive to your spot, scan your pass, and park with total peace of mind.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Blocks */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">

        {/* Event Parking */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="rounded-2xl overflow-hidden shadow-xl h-80 order-2 md:order-1">
            <img src="/assets/event_parking_crowd.png" alt="Crowd at event" className="w-full h-full object-cover" />
          </div>
          <div className="order-1 md:order-2 space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
              Event Parking
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Enjoy the game or concert without stressing about finding a parking spot. Book in advance and secure a spot just steps from the stadium or arena.
            </p>
            <ul className="space-y-3 font-medium text-blue-600">
              <li><a href="#" className="hover:underline">Madison Square Garden Parking</a></li>
              <li><a href="#" className="hover:underline">Yankee Stadium Parking</a></li>
              <li><a href="#" className="hover:underline">Wrigley Field Parking</a></li>
            </ul>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md mt-4">
              View All Venues
            </button>
          </div>
        </div>

        {/* Airport Parking */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
              Airport Parking
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Save on airport parking with convenient lots, complimentary shuttles, and valet services. Start your trip off right with stress-free parking.
            </p>
            <ul className="space-y-3 font-medium text-blue-600">
              <li><a href="#" className="hover:underline">JFK Airport Parking</a></li>
              <li><a href="#" className="hover:underline">LAX Airport Parking</a></li>
              <li><a href="#" className="hover:underline">O'Hare Airport Parking</a></li>
            </ul>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md mt-4">
              View All Airports
            </button>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-xl h-80">
            <img src="/assets/airport_parking.png" alt="Airport terminal" className="w-full h-full object-cover" />
          </div>
        </div>

      </section>

      {/* Trust Section */}
      <section className="bg-slate-50 py-20 border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          <h2 className="text-3xl font-bold tracking-tight">Pay and Park with Confidence</h2>

          <div className="flex flex-wrap justify-center gap-12 md:gap-24">
            <div className="flex flex-col items-center">
              <span className="text-5xl font-black text-slate-900 tracking-tighter">4.8</span>
              <span className="text-amber-500 text-xl tracking-widest mt-1">★★★★★</span>
              <span className="text-slate-500 mt-2 font-medium">App Store Rating</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-5xl font-black text-slate-900 tracking-tighter">100<span className="text-blue-600 text-4xl">+</span></span>
              <span className="text-slate-500 mt-2 font-medium">Million Cars Parked</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-5xl font-black text-slate-900 tracking-tighter">13<span className="text-blue-600 text-4xl">+</span></span>
              <span className="text-slate-500 mt-2 font-medium">Years of Trust</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xl leading-none tracking-tighter">
              P
            </div>
            <span className="text-xl font-bold text-blue-600 tracking-tight">ParkSpot</span>
          </div>
          <div className="text-slate-500 text-sm">
            © {new Date().getFullYear()} ParkSpot. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
