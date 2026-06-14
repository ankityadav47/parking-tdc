import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ArrowLeft, Navigation, AlertCircle } from 'lucide-react';

export default function DirectionsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const destLatParam = parseFloat(searchParams.get('destLat') || '');
  const destLngParam = parseFloat(searchParams.get('destLng') || '');
  const destAddress = searchParams.get('destAddress') || '';
  const destName = decodeURIComponent(searchParams.get('destName') || 'Destination');

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapProvider, setMapProvider] = useState<'google' | 'openfreemap'>('google');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(
    !isNaN(destLatParam) && !isNaN(destLngParam) ? { lat: destLatParam, lng: destLngParam } : null
  );
  const [error, setError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);

  // Fetch map provider config
  useEffect(() => {
    fetch('https://ghostwhite-badger-995775.hostingersite.com/api/v1/config')
      .then(r => r.json())
      .then(d => { if (d?.data?.mapProvider) setMapProvider(d.data.mapProvider); })
      .catch(() => {});
  }, []);

  // Geocode address via Nominatim if no coordinates supplied
  useEffect(() => {
    if (destCoords || !destAddress) return;

    const addr = decodeURIComponent(destAddress);
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`, {
      headers: { 'Accept-Language': 'en' }
    })
      .then(r => r.json())
      .then((results: any[]) => {
        if (results.length > 0) {
          setDestCoords({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) });
        } else {
          setError('Could not locate the destination address on the map.');
        }
      })
      .catch(() => setError('Geocoding failed. Please check your connection.'));
  }, [destAddress, destCoords]);

  // Request user location
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        console.error('Geolocation error', err);
        setError('Could not get your location. Please enable location services.');
      },
      { enableHighAccuracy: true }
    );
  }, []);

  // Initialize map and draw route once both locations are known
  useEffect(() => {
    if (!mapContainer.current || !userLocation || !destCoords) return;

    if (map.current) {
      map.current.remove();
    }

    const styleUrl = mapProvider === 'openfreemap'
      ? 'https://tiles.openfreemap.org/styles/liberty'
      : 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: [userLocation.lng, userLocation.lat],
      zoom: 13,
      attributionControl: false,
    });

    map.current.on('load', async () => {
      if (!map.current) return;

      // User Marker – Blue Dot
      const userEl = document.createElement('div');
      userEl.style.cssText = 'width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(59,130,246,0.5)';
      new maplibregl.Marker({ element: userEl })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map.current);

      // Destination Marker – Red Pin
      new maplibregl.Marker({ color: '#ef4444' })
        .setLngLat([destCoords.lng, destCoords.lat])
        .addTo(map.current);

      // Fetch route from OSRM
      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=geojson`;
        const res = await fetch(osrmUrl);
        const data = await res.json();

        if (data.routes?.length > 0) {
          const route = data.routes[0];
          const distKm = (route.distance / 1000).toFixed(1);
          const durMin = Math.round(route.duration / 60);
          setRouteInfo({ distance: `${distKm} km`, duration: `${durMin} min` });

          map.current.addSource('route', {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry: route.geometry },
          });
          map.current.addLayer({
            id: 'route-layer',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#3b82f6', 'line-width': 5, 'line-opacity': 0.85 },
          });

          const coords: [number, number][] = route.geometry.coordinates;
          const bounds = coords.reduce(
            (b, c) => b.extend(c),
            new maplibregl.LngLatBounds(coords[0], coords[0])
          );
          map.current.fitBounds(bounds, { padding: { top: 80, bottom: 200, left: 50, right: 50 } });
        } else {
          setError('Could not find a route to the destination.');
        }
      } catch {
        setError('Failed to fetch routing data. Check your connection.');
      }
    });

    return () => {
      if (map.current) { map.current.remove(); map.current = null; }
    };
  }, [userLocation, destCoords, mapProvider]);

  const isLoadingDest = !destCoords && !!destAddress && !error;

  return (
    <div className="h-screen w-full flex flex-col relative bg-slate-50">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 w-full z-10 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm p-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-6 h-6 text-slate-700" />
        </button>
        <div>
          <h1 className="font-bold text-slate-900 leading-tight">Directions</h1>
          <p className="text-sm text-slate-500 truncate max-w-[250px] sm:max-w-md">To {destName}</p>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 w-full" ref={mapContainer} />

      {/* Bottom Info Card */}
      <div className="absolute bottom-0 left-0 w-full z-10 p-4 sm:p-6 pb-8">
        <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 p-6 flex items-center justify-between min-h-[88px]">
          {error ? (
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : (!userLocation || isLoadingDest) ? (
            <div className="flex items-center gap-3 text-slate-500">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <p className="font-medium text-sm">{!userLocation ? 'Locating you...' : 'Finding destination...'}</p>
            </div>
          ) : routeInfo ? (
            <>
              <div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{routeInfo.duration}</p>
                <p className="text-sm text-slate-500 font-medium">{routeInfo.distance} · Fastest route</p>
              </div>
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                <Navigation className="w-6 h-6 text-white" />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 text-slate-500">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <p className="font-medium text-sm">Calculating route...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
