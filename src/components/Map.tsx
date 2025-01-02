import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { LocationData } from '../types';

interface MapProps {
  loading: boolean;
  error: { message: string; details: string } | null;
  location: LocationData | null;
}

export function Map({ loading, error, location }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    console.log('[Map] Initializing map');
    if (!mapRef.current) {
      mapRef.current = L.map('map').setView([0, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapRef.current);

      console.log('[Map] Map initialized');
    }

    return () => {
      console.log('[Map] Cleaning up map');
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current = null;
      }
      if (circleRef.current) {
        circleRef.current = null;
      }
    };
  }, []);

  // Update map when location changes
  useEffect(() => {
    if (!location || !mapRef.current) {
      console.log('[Map] Skipping update - no location or map', { location });
      return;
    }

    console.log('[Map] Updating location on map', {
      location,
      timestamp: new Date().toISOString(),
    });

    const { lat, lon, accuracy } = location;

    if (!markerRef.current) {
      console.log('[Map] Setting initial view', { lat, lon });
      mapRef.current.setView([lat, lon], 15);
    }

    if (markerRef.current) {
      console.log('[Map] Updating marker position');
      markerRef.current.setLatLng([lat, lon]);
    } else {
      console.log('[Map] Creating new marker');
      markerRef.current = L.marker([lat, lon]).addTo(mapRef.current);
      markerRef.current.bindPopup('You are here!').openPopup();
    }

    if (circleRef.current) {
      console.log('[Map] Updating accuracy circle');
      circleRef.current.setLatLng([lat, lon]);
      circleRef.current.setRadius(accuracy);
    } else {
      console.log('[Map] Creating accuracy circle');
      circleRef.current = L.circle([lat, lon], {
        radius: accuracy,
        color: '#4285F4',
        fillColor: '#4285F4',
        fillOpacity: 0.15,
        weight: 1,
      }).addTo(mapRef.current);
    }
  }, [location]);

  return (
    <div className="relative h-[70vh] lg:h-screen">
      <div id="map" className="h-full w-full" />

      {loading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 p-5 rounded-lg shadow-lg text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-gray-800">Getting your location...</div>
        </div>
      )}

      {error && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 p-5 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-red-600 mb-1">{error.message}</div>
          <div className="text-sm text-gray-600 whitespace-pre-line">{error.details}</div>
        </div>
      )}
    </div>
  );
}
