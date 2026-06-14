import React, { useEffect, useRef, useState, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { MapPin, Search, X } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string;

setOptions({
  apiKey: MAPS_KEY,
  version: 'weekly',
});

export interface PickedLocation {
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  value: PickedLocation | null;
  onChange: (loc: PickedLocation) => void;
}

export default function LocationPicker({ value, onChange }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [mapProvider, setMapProvider] = useState<'google' | 'openfreemap' | null>(null);
  
  // Google Map state
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  
  // OpenFreeMap state (refs used directly to avoid dependency loops)
  const libreMapRef = useRef<maplibregl.Map | null>(null);
  const libreMarkerRef = useRef<maplibregl.Marker | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch map provider config
  useEffect(() => {
    fetch('http://localhost:4000/api/v1/config')
      .then(r => r.json())
      .then(d => {
        if (d?.data?.mapProvider) {
          setMapProvider(d.data.mapProvider);
        } else {
          setMapProvider('google');
        }
      })
      .catch(e => {
        console.error('Failed to load map config', e);
        setMapProvider('google');
      });
  }, []);

  // Debounce autocomplete
  useEffect(() => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        if (mapProvider === 'openfreemap') {
          const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
          const data = await res.json();
          setSuggestions(
            data.features.map((f: any) => ({
              id: f.properties.osm_id,
              name: f.properties.name || f.properties.street || query,
              description: [f.properties.city, f.properties.state, f.properties.country].filter(Boolean).join(', '),
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0],
            }))
          );
        } else if (mapProvider === 'google') {
          const res = await fetch(`http://localhost:4000/api/v1/search/autocomplete?q=${encodeURIComponent(query)}`);
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
  }, [query, mapProvider]);

  const handleSelectSuggestion = (s: any) => {
    const fullAddress = s.description ? `${s.name}, ${s.description}` : s.name;
    setQuery(fullAddress);
    setShowSuggestions(false);
    
    if (s.lat && s.lng && mapProvider === 'openfreemap') {
      if (libreMapRef.current) {
        libreMapRef.current.flyTo({ center: [s.lng, s.lat], zoom: 17 });
        if (libreMarkerRef.current) libreMarkerRef.current.setLngLat([s.lng, s.lat]);
      }
      // reverseGeocode requires coordinates to be passed to it
      // we must use standard setTimeout or just call it if we don't have dependency cycles
      // however reverseGeocode is defined below, so we'll just let the user hit Search for google, or for openfreemap we can trigger search programmatically
      // To avoid hoisting issues, we'll let them click Search, or we can trigger a form submit.
      // Let's just set the query. The user can click the "Search" button.
    }
  };

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (mapProvider === 'openfreemap') {
      try {
        const res = await fetch(`https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}`);
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          const props = data.features[0].properties;
          onChange({
            addressLine1: props.street || props.name || '',
            city: props.city || props.county || '',
            state: props.state || '',
            postalCode: props.postcode || '',
            country: props.country || '',
            lat,
            lng
          });
          setQuery([props.name, props.street, props.city].filter(Boolean).join(', '));
        } else {
          throw new Error('No features found');
        }
      } catch (err) {
        console.error('Reverse geocode failed', err);
        onChange({ 
          addressLine1: 'Pinned Location', city: '', state: '', postalCode: '', country: '', lat, lng 
        });
      }
      return;
    }

    try {
      const { Geocoder } = await importLibrary('geocoding') as google.maps.GeocodingLibrary;
      const geocoder = new Geocoder();
      const result = await geocoder.geocode({ location: { lat, lng } });
      if (result.results[0]) {
        const comps = result.results[0].address_components;
        const get = (type: string) =>
          comps.find(c => c.types.includes(type))?.long_name || '';

        const streetNumber = get('street_number');
        const route = get('route');
        const sublocality = get('sublocality_level_1') || get('sublocality') || get('neighborhood');
        const city = get('locality') || get('administrative_area_level_2');
        const state = get('administrative_area_level_1');
        const postalCode = get('postal_code');
        const country = get('country');
        const addressLine1 = [streetNumber, route, sublocality].filter(Boolean).join(', ')
          || result.results[0].formatted_address.split(',')[0];

        onChange({ addressLine1, city, state, postalCode, country, lat, lng });
        setQuery(result.results[0].formatted_address);
      }
    } catch (err) {
      console.error('Reverse geocode failed', err);
      onChange({ 
        addressLine1: 'Pinned Location (Geocoding unavailable)', 
        city: '', state: '', postalCode: '', country: '', lat, lng 
      });
    }
  }, [onChange, mapProvider]);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || !mapProvider) return;

    if (mapProvider === 'openfreemap') {
      if (!libreMapRef.current) {
        const defaultCenter: [number, number] = value 
          ? [value.lng, value.lat] 
          : [77.5946, 12.9716]; // Bangalore default

        libreMapRef.current = new maplibregl.Map({
          container: mapRef.current,
          style: 'https://tiles.openfreemap.org/styles/liberty',
          center: defaultCenter,
          zoom: value ? 16 : 13,
        });

        libreMarkerRef.current = new maplibregl.Marker({ draggable: true })
          .setLngLat(defaultCenter)
          .addTo(libreMapRef.current);

        libreMarkerRef.current.on('dragend', () => {
          const lngLat = libreMarkerRef.current!.getLngLat();
          reverseGeocode(lngLat.lat, lngLat.lng);
        });

        libreMapRef.current.on('click', (e) => {
          libreMarkerRef.current!.setLngLat(e.lngLat);
          reverseGeocode(e.lngLat.lat, e.lngLat.lng);
        });
        
        setLoading(false);
      }
      return () => {
        if (libreMapRef.current) {
          libreMapRef.current.remove();
          libreMapRef.current = null;
          libreMarkerRef.current = null;
        }
      };
    } else {
      let isMounted = true;
      async function initGoogleMap() {
        try {
          const { Map } = await importLibrary('maps') as google.maps.MapsLibrary;
          const { Marker, Animation } = await importLibrary('marker') as google.maps.MarkerLibrary;

          if (!isMounted || !mapRef.current) return;

          const defaultCenter = value
            ? { lat: value.lat, lng: value.lng }
            : { lat: 12.9716, lng: 77.5946 };

          const mapInstance = new Map(mapRef.current, {
            center: defaultCenter,
            zoom: value ? 16 : 13,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            styles: [
              { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            ],
          });

          const markerInstance = new Marker({
            map: mapInstance,
            position: defaultCenter,
            draggable: true,
            title: 'Drag to adjust position',
            animation: Animation.DROP,
          });

          mapInstance.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return;
            markerInstance.setPosition(e.latLng);
            reverseGeocode(e.latLng.lat(), e.latLng.lng());
          });

          markerInstance.addListener('dragend', () => {
            const pos = markerInstance.getPosition();
            if (pos) reverseGeocode(pos.lat(), pos.lng());
          });

          setMap(mapInstance);
          setMarker(markerInstance);
          setLoading(false);
        } catch (err) {
          if (!isMounted) return;
          setError('Failed to load Google Maps. Check your API key.');
          setLoading(false);
        }
      }
      initGoogleMap();
      return () => { isMounted = false; };
    }
  }, [mapProvider, reverseGeocode]); // recreate if mapProvider changes

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !mapProvider) return;
    setSearching(true);

    if (mapProvider === 'openfreemap') {
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`);
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].geometry.coordinates;
          if (libreMapRef.current) {
            libreMapRef.current.flyTo({ center: [lng, lat], zoom: 17 });
            if (libreMarkerRef.current) libreMarkerRef.current.setLngLat([lng, lat]);
          }
          reverseGeocode(lat, lng);
        } else {
          alert('Address not found!');
        }
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setSearching(false);
      }
      return;
    }

    if (!map || !marker) {
      setSearching(false);
      return;
    }

    try {
      const { Geocoder } = await importLibrary('geocoding') as google.maps.GeocodingLibrary;
      const { Animation } = await importLibrary('marker') as google.maps.MarkerLibrary;
      const geocoder = new Geocoder();
      const result = await geocoder.geocode({ address: query });
      
      if (result.results[0]) {
        const loc = result.results[0].geometry.location;
        map.panTo(loc);
        map.setZoom(17);
        marker.setPosition(loc);
        marker.setAnimation(Animation.DROP);
        reverseGeocode(loc.lat(), loc.lng());
      }
    } catch (err) {
      console.error('Search failed', err);
      alert('Address search failed. Your Google Maps API key might not have Geocoding enabled or lacks billing.');
    } finally {
      setSearching(false);
    }
  }, [query, mapProvider, map, marker, reverseGeocode]);

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Search address or landmark..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl outline-none text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-y-auto max-h-60">
              {suggestions.map(s => (
                <div 
                  key={s.id} 
                  className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 text-left"
                  onMouseDown={() => {
                    const fullAddress = s.description ? `${s.name}, ${s.description}` : s.name;
                    setQuery(fullAddress);
                    setShowSuggestions(false);
                  }}
                >
                  <div className="text-sm font-bold text-slate-900">{s.name}</div>
                  <div className="text-xs text-slate-500">{s.description}</div>
                </div>
              ))}
            </div>
          )}
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={searching}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          {searching ? '...' : 'Search'}
        </button>
      </form>

      {/* Map container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 320 }}>
        {loading && (
          <div className="absolute inset-0 bg-slate-100 flex items-center justify-center z-10">
            <div className="text-slate-400 text-sm flex items-center gap-2">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Loading map...
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 bg-red-50 flex items-center justify-center z-10 p-4 text-red-600 text-sm text-center">{error}</div>
        )}
        <div ref={mapRef} className="w-full h-full" />

        {/* Instruction overlay */}
        {!loading && !error && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full px-4 py-1.5 text-xs text-slate-600 shadow pointer-events-none whitespace-nowrap">
            Click on map or drag the pin to set exact location
          </div>
        )}
      </div>

      {/* Selected address display */}
      {value && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 flex items-start gap-3">
          <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-green-800">{value.addressLine1}</div>
            <div className="text-green-700">{[value.city, value.state, value.postalCode].filter(Boolean).join(', ')}</div>
            <div className="text-green-600 text-xs mt-0.5">📍 {value.lat.toFixed(6)}, {value.lng.toFixed(6)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
