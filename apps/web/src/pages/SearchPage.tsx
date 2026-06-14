import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Search, MapPin, Star, PlaneTakeoff, Filter, ChevronDown, Navigation } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const API = import.meta.env.VITE_API_BASE_URL || 'https://ghostwhite-badger-995775.hostingersite.com/api/v1';

function getPrice(rateRules: any[]): number {
  if (!rateRules || rateRules.length === 0) return 0;
  return Math.round(rateRules[0].priceCents / 100);
}

// Keep track of all markers so we can clear them on re-fetch
const markerRefs: maplibregl.Marker[] = [];

function clearMarkers() {
  markerRefs.forEach(m => m.remove());
  markerRefs.length = 0;
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const address = searchParams.get('address') || '';

  // Restore map state from URL params (preserved across navigation)
  const urlLat = parseFloat(searchParams.get('mlat') || '');
  const urlLng = parseFloat(searchParams.get('mlng') || '');
  const urlZoom = parseFloat(searchParams.get('mzoom') || '');
  const urlSelected = searchParams.get('selected') || null;
  const urlStart = searchParams.get('start');
  const urlEnd = searchParams.get('end');

  const initialCenter: [number, number] = (
    !isNaN(urlLat) && !isNaN(urlLng) ? [urlLng, urlLat] : [78.1828, 26.2183]
  );
  const initialZoom = !isNaN(urlZoom) ? urlZoom : 12;

  const [selectedFacility, setSelectedFacility] = useState<string | null>(urlSelected);
  const [inputValue, setInputValue] = useState(address);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [searchByMap, setSearchByMap] = useState(false); // true when map was moved by user

  const [startDate, setStartDate] = useState(() => {
    if (urlStart) return urlStart.split('T')[0];
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState(() => {
    if (urlStart) return new Date(urlStart).toTimeString().slice(0, 5);
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toTimeString().slice(0, 5);
  });
  const [endDate, setEndDate] = useState(() => {
    if (urlEnd) return urlEnd.split('T')[0];
    const d = new Date();
    d.setHours(d.getHours() + 4, 0, 0, 0);
    return d.toISOString().split('T')[0];
  });
  const [endTime, setEndTime] = useState(() => {
    if (urlEnd) return new Date(urlEnd).toTimeString().slice(0, 5);
    const d = new Date();
    d.setHours(d.getHours() + 4, 0, 0, 0);
    return d.toTimeString().slice(0, 5);
  });

  // Calculate full ISO strings for the current selected times
  const currentStartISO = new Date(`${startDate}T${startTime}:00`).toISOString();
  const currentEndISO = new Date(`${endDate}T${endTime}:00`).toISOString();

  // Keep a ref so callbacks always read the latest times without needing to be recreated
  const latestTimes = useRef({ start: currentStartISO, end: currentEndISO });
  latestTimes.current = { start: currentStartISO, end: currentEndISO };

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper: sync map state into URL so back-navigation restores the view
  const syncMapStateToUrl = useCallback(() => {
    if (!map.current) return;
    const c = map.current.getCenter();
    const z = map.current.getZoom();
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('mlat', c.lat.toFixed(6));
      next.set('mlng', c.lng.toFixed(6));
      next.set('mzoom', z.toFixed(2));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // ─── Fetch facilities by lat/lng ─────────────────────────────────
  const fetchByCoords = useCallback(async (lat: number, lng: number, startOverride?: string, endOverride?: string) => {
    setIsLoading(true);
    try {
      const start = startOverride || latestTimes.current.start;
      const end = endOverride || latestTimes.current.end;
      const res = await fetch(`${API}/search?lat=${lat}&lng=${lng}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&radius=50000`);
      const data = await res.json();
      const results = data.data || [];
      setFacilities(results);
      return results;
    } catch (e) {
      console.error('Fetch by coords error', e);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fetch facilities by address string ──────────────────────────
  const fetchByAddress = useCallback(async (addr: string, startOverride?: string, endOverride?: string) => {
    if (!addr.trim()) return;
    setIsLoading(true);
    try {
      const start = startOverride || latestTimes.current.start;
      const end = endOverride || latestTimes.current.end;
      const res = await fetch(`${API}/search?address=${encodeURIComponent(addr)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&radius=50000`);
      const data = await res.json();
      const results = data.data || [];
      setFacilities(results);
      // Move map to the search center if available
      if (data.meta?.searchCenter && map.current) {
        const { lat, lng } = data.meta.searchCenter;
        map.current.flyTo({ center: [lng, lat], zoom: 13 });
      }
      return results;
    } catch (e) {
      console.error('Fetch by address error', e);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Initialize map ──────────────────────────────────────────────
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: initialCenter,
      zoom: initialZoom,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // On map moveend: debounce search + sync URL state
    map.current.on('moveend', () => {
      if (!map.current) return;
      const center = map.current.getCenter();
      syncMapStateToUrl();
      // Debounce so we don't hammer the API on every pixel
      if (moveTimer.current) clearTimeout(moveTimer.current);
      moveTimer.current = setTimeout(() => {
        setSearchByMap(true);
        setMapCenter({ lat: center.lat, lng: center.lng });
      }, 600);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── When map center changes (user panned), search there ─────────
  useEffect(() => {
    if (!mapCenter || !searchByMap) return;
    fetchByCoords(mapCenter.lat, mapCenter.lng);
  }, [mapCenter, searchByMap, fetchByCoords]);

  // ─── Initial load: if we have saved map coords in URL, fetch by those; else by address
  useEffect(() => {
    if (!isNaN(urlLat) && !isNaN(urlLng)) {
      fetchByCoords(urlLat, urlLng, urlStart || currentStartISO, urlEnd || currentEndISO);
    } else if (address) {
      setSearchByMap(false);
      fetchByAddress(address, urlStart || currentStartISO, urlEnd || currentEndISO);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Track first render so time-change effect doesn't double-fire on mount ──
  const isFirstRender = useRef(true);

  // Trigger search when times change (but NOT on initial mount)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const s = new Date(`${startDate}T${startTime}:00`).toISOString();
    const e = new Date(`${endDate}T${endTime}:00`).toISOString();

    // Validate: end must be after start
    if (new Date(e) <= new Date(s)) return;

    // update URL to reflect new times
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('start', s);
      next.set('end', e);
      return next;
    }, { replace: true });

    if (!isNaN(urlLat) && !isNaN(urlLng)) {
      fetchByCoords(urlLat, urlLng, s, e);
    } else if (address) {
      fetchByAddress(address, s, e);
    }
  }, [startDate, startTime, endDate, endTime]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Place/update markers on map when facilities change ──────────
  useEffect(() => {
    if (!map.current) return;
    clearMarkers();

    facilities.forEach((f: any) => {
      if (!f.lat || !f.lng) return;
      const price = getPrice(f.rateRules);
      const isSelected = selectedFacility === f.id;
      const imgUrl = f.coverPhotoUrl || null;
      const parkingIconSvg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><rect width='40' height='40' fill='#2563eb'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='Arial,sans-serif' font-weight='bold' font-size='22' fill='white'>P</text></svg>`)}`;

      // ── Marker element (built via DOM, no innerHTML so no onerror syntax errors) ──
      const el = document.createElement('div');
      el.style.cssText = 'cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;';

      const imgWrap = document.createElement('div');
      const sz = isSelected ? '52px' : '44px';
      imgWrap.style.cssText = `width:${sz};height:${sz};border-radius:8px;overflow:hidden;border:${isSelected ? '3px solid #1e40af' : '2px solid white'};box-shadow:${isSelected ? '0 4px 16px rgba(30,64,175,0.5)' : '0 2px 8px rgba(0,0,0,0.35)'};background:#e2e8f0;flex-shrink:0;`;
      const markerImg = document.createElement('img');
      markerImg.src = imgUrl || parkingIconSvg;
      markerImg.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      markerImg.onerror = () => { markerImg.src = parkingIconSvg; };
      imgWrap.appendChild(markerImg);

      const badge = document.createElement('div');
      badge.style.cssText = `background:${isSelected ? '#1e40af' : '#2563eb'};color:white;font-weight:700;font-size:11px;padding:2px 8px;border-radius:999px;border:1.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.25);white-space:nowrap;`;
      badge.textContent = price > 0 ? `₹${price}/hr` : f.name.substring(0, 6);

      el.appendChild(imgWrap);
      el.appendChild(badge);

      el.addEventListener('click', () => {
        setSelectedFacility(f.id);
        setSearchParams(prev => {
          const next = new URLSearchParams(prev);
          next.set('selected', f.id);
          return next;
        }, { replace: true });
        const card = document.getElementById(`facility-card-${f.id}`);
        card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([f.lng, f.lat]);

      // ── Popup (simple, no inline onclick/onerror) ──
      const popupOffsets: any = {
        'top': [0, 10], 'top-left': [0, 10], 'top-right': [0, 10],
        'bottom': [0, -70], 'bottom-left': [0, -70], 'bottom-right': [0, -70],
        'left': [-25, -35], 'right': [25, -35]
      };
      const popup = new maplibregl.Popup({ offset: popupOffsets, closeButton: true, maxWidth: '280px' });

      // Build popup DOM element entirely in JS to avoid any injection issues
      const popupEl = document.createElement('div');
      popupEl.style.cssText = 'width:260px;border-radius:12px;overflow:hidden;font-family:system-ui,sans-serif;';

      // Carousel wrapper
      const carouselWrap = document.createElement('div');
      carouselWrap.style.cssText = 'position:relative;width:260px;height:160px;background:#e2e8f0;overflow:hidden;';

      const track = document.createElement('div');
      track.style.cssText = 'display:flex;height:100%;transition:transform 0.4s ease;';
      (track as any).dataset.idx = '0';
      (track as any).dataset.total = '1';

      const initialImg = document.createElement('img');
      initialImg.src = imgUrl || parkingIconSvg;
      initialImg.style.cssText = 'min-width:260px;height:160px;object-fit:cover;flex-shrink:0;';
      initialImg.onerror = () => { initialImg.src = parkingIconSvg; };
      track.appendChild(initialImg);

      // Prev / Next buttons
      const prevBtn = document.createElement('button');
      prevBtn.style.cssText = 'display:none;position:absolute;left:6px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.45);border:none;color:white;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:16px;line-height:1;z-index:5;align-items:center;justify-content:center;';
      prevBtn.innerHTML = '&#8249;';

      const nextBtn = document.createElement('button');
      nextBtn.style.cssText = 'display:none;position:absolute;right:6px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.45);border:none;color:white;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:16px;line-height:1;z-index:5;align-items:center;justify-content:center;';
      nextBtn.innerHTML = '&#8250;';

      const dotsContainer = document.createElement('div');
      dotsContainer.style.cssText = 'display:none;position:absolute;bottom:8px;left:50%;transform:translateX(-50%);gap:5px;z-index:5;flex-direction:row;';

      carouselWrap.appendChild(track);
      carouselWrap.appendChild(prevBtn);
      carouselWrap.appendChild(nextBtn);
      carouselWrap.appendChild(dotsContainer);

      // Info section
      const infoDiv = document.createElement('div');
      infoDiv.style.cssText = 'padding:10px 12px 12px;background:white;';
      const nameDiv = document.createElement('div');
      nameDiv.style.cssText = 'font-weight:700;font-size:14px;color:#0f172a;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      nameDiv.textContent = f.name;
      const addrDiv = document.createElement('div');
      addrDiv.style.cssText = 'font-size:12px;color:#64748b;margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      addrDiv.textContent = `${f.addressLine1 || ''}, ${f.city || ''}`;
      const priceDiv = document.createElement('div');
      priceDiv.style.cssText = 'font-size:14px;font-weight:700;color:#2563eb;';
      priceDiv.textContent = price > 0 ? `₹${price}/hr` : 'Contact for price';
      infoDiv.appendChild(nameDiv);
      infoDiv.appendChild(addrDiv);
      infoDiv.appendChild(priceDiv);

      popupEl.appendChild(carouselWrap);
      popupEl.appendChild(infoDiv);
      popup.setDOMContent(popupEl);

      // Carousel logic using proper event listeners
      const goTo = (idx: number, total: number) => {
        track.style.transform = `translateX(-${idx * 260}px)`;
        (track as any).dataset.idx = String(idx);
        dotsContainer.querySelectorAll('span').forEach((d: any, i: number) => {
          d.style.opacity = i === idx ? '1' : '0.4';
        });
      };

      let autoTimer: ReturnType<typeof setInterval> | null = null;
      const startAuto = (total: number) => {
        if (autoTimer) clearInterval(autoTimer);
        if (total < 2) return;
        autoTimer = setInterval(() => {
          const cur = parseInt((track as any).dataset.idx || '0');
          goTo((cur + 1) % total, total);
        }, 3000);
      };

      popup.on('open', () => {
        fetch(`${API}/facilities/${f.id}`)
          .then(r => r.json())
          .then(data => {
            const photos: string[] = (data.data?.photos || []).map((p: any) => p.url).filter(Boolean);
            if (photos.length === 0 && imgUrl) photos.push(imgUrl);
            if (photos.length === 0) return;

            // Rebuild track with all photos
            track.innerHTML = '';
            photos.forEach(url => {
              const slide = document.createElement('img');
              slide.src = url;
              slide.style.cssText = 'min-width:260px;height:160px;object-fit:cover;flex-shrink:0;';
              slide.onerror = () => { slide.src = parkingIconSvg; };
              track.appendChild(slide);
            });
            (track as any).dataset.idx = '0';
            (track as any).dataset.total = String(photos.length);

            if (photos.length > 1) {
              prevBtn.style.display = 'flex';
              nextBtn.style.display = 'flex';
              dotsContainer.style.display = 'flex';
              dotsContainer.innerHTML = '';
              photos.forEach((_, i) => {
                const dot = document.createElement('span');
                dot.style.cssText = `width:7px;height:7px;border-radius:50%;background:white;opacity:${i === 0 ? '1' : '0.4'};cursor:pointer;display:inline-block;`;
                dot.addEventListener('click', () => goTo(i, photos.length));
                dotsContainer.appendChild(dot);
              });
              prevBtn.onclick = () => {
                const cur = parseInt((track as any).dataset.idx || '0');
                goTo((cur - 1 + photos.length) % photos.length, photos.length);
              };
              nextBtn.onclick = () => {
                const cur = parseInt((track as any).dataset.idx || '0');
                goTo((cur + 1) % photos.length, photos.length);
              };
              startAuto(photos.length);
            }
          })
          .catch(() => {});

        popup.once('close', () => { if (autoTimer) clearInterval(autoTimer); });
      });

      marker.setPopup(popup).addTo(map.current!);
      markerRefs.push(marker);
    });
  }, [facilities, selectedFacility]);

  // ─── Autocomplete via free Photon API ────────────────────────────
  useEffect(() => {
    if (!inputValue || inputValue.length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(inputValue)}&limit=5`);
        const data = await res.json();
        setSuggestions(data.features?.map((f: any) => ({
          id: f.properties.osm_id,
          name: f.properties.name || f.properties.street || inputValue,
          description: [f.properties.city, f.properties.state, f.properties.country].filter(Boolean).join(', '),
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
        })) || []);
      } catch (e) {
        console.error('Autocomplete error', e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const handleSelectSuggestion = (s: any) => {
    const fullAddress = s.description ? `${s.name}, ${s.description}` : s.name;
    setInputValue(fullAddress);
    setShowSuggestions(false);
    setSearchByMap(false);

    // Update URL
    const newParams = new URLSearchParams(searchParams);
    newParams.set('address', fullAddress);
    setSearchParams(newParams);

    // Fly map to selected location and search there
    if (s.lat && s.lng) {
      map.current?.flyTo({ center: [s.lng, s.lat], zoom: 13 });
      fetchByCoords(s.lat, s.lng);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    setSearchByMap(false);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('address', inputValue);
    setSearchParams(newParams);
  };

  return (
    <div className="h-screen flex flex-col bg-white text-slate-900 font-sans overflow-hidden">
      <Header />

      {/* Top Search Bar */}
      <div className="border-b border-slate-200 bg-white z-10 px-4 py-3 flex items-center gap-4 shadow-sm">
        <div className="flex-1 max-w-4xl mx-auto flex items-center gap-2">

          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center border border-slate-300 rounded-lg px-3 py-2 focus-within:ring-2 ring-blue-600 bg-white relative">
            <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
            <div className="flex flex-col flex-1 relative">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Where are you going?</span>
              <input
                type="text"
                className="w-full outline-none text-sm font-medium text-slate-900"
                value={inputValue}
                onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search city, area, landmark..."
              />
            </div>
            <button type="submit" className="ml-2 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0">
              Search
            </button>

            {/* Autocomplete Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-y-auto max-h-64">
                {suggestions.map(s => (
                  <div
                    key={s.id}
                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 flex items-start gap-2"
                    onMouseDown={() => handleSelectSuggestion(s)}
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{s.name}</div>
                      <div className="text-xs text-slate-500">{s.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </form>

          <div className="w-px h-10 bg-slate-200 mx-1" />

          <div className="flex items-center gap-2">
            <div className="flex flex-col px-3 py-1 border border-slate-300 rounded-lg min-w-[130px] cursor-pointer hover:border-blue-400 bg-white">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Start time</span>
              <div className="flex gap-2">
                <input 
                  type="date" 
                  className="text-xs font-semibold text-slate-900 bg-transparent outline-none w-full cursor-pointer"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
                <input 
                  type="time" 
                  className="text-xs font-semibold text-slate-900 bg-transparent outline-none w-full cursor-pointer"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col px-3 py-1 border border-slate-300 rounded-lg min-w-[130px] cursor-pointer hover:border-blue-400 bg-white">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">End time</span>
              <div className="flex gap-2">
                <input 
                  type="date" 
                  className="text-xs font-semibold text-slate-900 bg-transparent outline-none w-full cursor-pointer"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
                <input 
                  type="time" 
                  className="text-xs font-semibold text-slate-900 bg-transparent outline-none w-full cursor-pointer"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="border-b border-slate-200 bg-white px-6 py-2.5 flex items-center gap-3 overflow-x-auto z-10">
        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-full text-sm font-medium hover:bg-slate-50 transition-colors">
          <Filter className="w-3.5 h-3.5" /> Filters
        </button>
        {['Covered', 'EV Charging', 'Valet', 'ADA Accessible', 'Gated'].map(f => (
          <button key={f} className="px-3 py-1.5 border border-slate-300 rounded-full text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap">{f}</button>
        ))}
      </div>

      {/* Main Content Split */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left List */}
        <div className="w-[420px] bg-slate-50 border-r border-slate-200 overflow-y-auto flex flex-col">
          <div className="flex justify-between items-center px-4 py-3 border-b border-slate-200 bg-white sticky top-0 z-10">
            <span className="text-sm font-semibold text-slate-700">
              {isLoading ? (
                <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" /> Searching...</span>
              ) : (
                <>{facilities.length} {facilities.length === 1 ? 'facility' : 'facilities'} found</>
              )}
            </span>
            <button className="text-sm font-medium text-blue-600 flex items-center gap-1 hover:underline">
              Sort by Distance <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 flex flex-col gap-3">
            {!isLoading && facilities.length === 0 && (
              <div className="text-center py-16 px-6">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <PlaneTakeoff className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">No facilities found</h3>
                <p className="text-slate-500 text-sm mt-1">Try searching a different area or move the map to explore nearby parking.</p>
              </div>
            )}

            {facilities.map((res: any) => {
              const price = getPrice(res.rateRules);
              const isSelected = selectedFacility === res.id;
              return (
                <div
                  id={`facility-card-${res.id}`}
                  key={res.id}
                  className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${isSelected ? 'border-blue-500 ring-2 ring-blue-100 shadow-md' : 'border-slate-200'}`}
                  onClick={() => {
                    setSelectedFacility(res.id);
                    setSearchParams(prev => {
                      const next = new URLSearchParams(prev);
                      next.set('selected', res.id);
                      return next;
                    }, { replace: true });
                    if (res.lat && res.lng && map.current) {
                      map.current.flyTo({ center: [res.lng, res.lat], zoom: 15 });
                    }
                  }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                        <PlaneTakeoff className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm leading-tight truncate">{res.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{res.addressLine1}, {res.city}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-0.5 text-xs font-medium">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{res.avgRating ? res.avgRating.toFixed(1) : 'New'}</span>
                            <span className="text-slate-400">({res.reviewCount || 0})</span>
                          </div>
                          {res.distanceMeters && (
                            <span className="text-xs text-slate-400">· {res.distanceMeters < 1000 ? `${res.distanceMeters}m` : `${(res.distanceMeters / 1000).toFixed(1)}km`} away</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      {price > 0 ? (
                        <>
                          <div className="text-base font-black text-slate-900">₹{price}<span className="text-xs font-normal text-slate-500">/hr</span></div>
                          <div className="text-xs text-blue-600 font-medium">₹{price * 24}/day</div>
                        </>
                      ) : (
                        <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">Contact</div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <Link
                      to={`/facilities/${res.id}`}
                      state={{ fromSearch: true, startISO: currentStartISO, endISO: currentEndISO }}
                      className="flex-1 text-center text-blue-600 font-semibold text-xs border border-blue-200 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      Details
                    </Link>
                    <Link
                      to={`/facilities/${res.id}`}
                      state={{ fromSearch: true, startISO: currentStartISO, endISO: currentEndISO }}
                      className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-xs transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      Book Now
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Map - always OpenFreeMap (interactive) */}
        <div className="flex-1 relative">
          <div ref={mapContainer} className="w-full h-full" />

          {/* "Search this area" button when user has panned the map */}
          {searchByMap && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
              <button
                className="flex items-center gap-2 bg-white shadow-lg border border-slate-200 text-slate-800 font-semibold text-sm px-4 py-2.5 rounded-full hover:bg-slate-50 transition-all"
                onClick={() => {
                  if (!map.current) return;
                  const c = map.current.getCenter();
                  fetchByCoords(c.lat, c.lng);
                  setSearchByMap(false);
                }}
              >
                <Navigation className="w-4 h-4 text-blue-600" />
                Search this area
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
