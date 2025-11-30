'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FiHome, FiUsers, FiDollarSign, FiAlertCircle, FiMaximize2 } from 'react-icons/fi';

interface Property {
  id: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
  unit_count: number;
  property_type: string | null;
  status: string | null;
  monthly_rent: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface DashboardMapProps {
  properties: Property[];
  tenantCounts: Record<string, number>;
}

interface GeocodedProperty {
  property: Property;
  lat: number;
  lng: number;
}

const propertyTypeLabels: Record<string, string> = {
  single_family: 'Single Family',
  duplex: 'Duplex',
  apartment: 'Apartment',
  condo: 'Condo',
  townhouse: 'Townhouse',
  other: 'Other',
};

const statusColors: Record<string, { bg: string; text: string }> = {
  available: { bg: 'bg-green-100', text: 'text-green-700' },
  occupied: { bg: 'bg-blue-100', text: 'text-blue-700' },
  under_construction: { bg: 'bg-orange-100', text: 'text-orange-700' },
};

export default function DashboardMap({ properties, tenantCounts }: DashboardMapProps) {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mapboxglRef = useRef<any>(null);
  const [markers, setMarkers] = useState<GeocodedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<GeocodedProperty | null>(null);

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Geocode address using Mapbox Geocoding API
  const geocodeAddress = useCallback(async (
    address: string,
    city: string,
    state: string,
    zip: string
  ): Promise<{ lat: number; lng: number } | null> => {
    if (!MAPBOX_TOKEN) return null;

    const query = `${address}, ${city}, ${state} ${zip}`;
    const encoded = encodeURIComponent(query);

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&country=us&types=address&limit=1`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        return { lat, lng };
      }

      // Fallback to city/state/zip
      const fallbackQuery = `${city}, ${state} ${zip}`;
      const fallbackEncoded = encodeURIComponent(fallbackQuery);
      const fallbackResponse = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${fallbackEncoded}.json?access_token=${MAPBOX_TOKEN}&country=us&types=place,postcode&limit=1`
      );
      const fallbackData = await fallbackResponse.json();

      if (fallbackData.features && fallbackData.features.length > 0) {
        const [lng, lat] = fallbackData.features[0].center;
        return { lat, lng };
      }

      return null;
    } catch {
      return null;
    }
  }, [MAPBOX_TOKEN]);

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!MAPBOX_TOKEN) {
      setMapError('Mapbox token not configured');
      setLoading(false);
      return;
    }

    let isMounted = true;

    const initMap = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;

        // Import CSS
        if (typeof document !== 'undefined') {
          const existingLink = document.querySelector('link[href*="mapbox-gl"]');
          if (!existingLink) {
            const link = document.createElement('link');
            link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
          }
        }

        mapboxglRef.current = mapboxgl;
        mapboxgl.accessToken = MAPBOX_TOKEN;

        if (mapContainerRef.current && !mapRef.current && isMounted) {
          const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: process.env.NEXT_PUBLIC_MAPBOX_STYLE || 'mapbox://styles/david4nderson/cmikggsgv006w01qt6zok80ay',
            center: [-98.5, 31.0],
            zoom: 5,
          });

          map.addControl(new mapboxgl.NavigationControl(), 'top-right');
          mapRef.current = map;

          map.on('load', () => {
            if (isMounted) {
              setMapLoaded(true);
            }
          });

          map.on('error', (e: any) => {
            console.error('Map error:', e);
          });
        }
      } catch (err) {
        console.error('Error initializing map:', err);
        if (isMounted) {
          setMapError('Failed to load map');
          setLoading(false);
        }
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [MAPBOX_TOKEN]);

  // Geocode properties
  useEffect(() => {
    if (!MAPBOX_TOKEN) return;

    async function geocodeAllProperties() {
      if (properties.length === 0) {
        setLoading(false);
        return;
      }

      const geocoded: GeocodedProperty[] = [];

      for (const property of properties) {
        if (property.latitude && property.longitude) {
          geocoded.push({
            property,
            lat: property.latitude,
            lng: property.longitude,
          });
          continue;
        }

        const coords = await geocodeAddress(
          property.address_line1,
          property.city,
          property.state,
          property.zip
        );

        if (coords) {
          geocoded.push({
            property,
            lat: coords.lat,
            lng: coords.lng,
          });
        }
      }

      setMarkers(geocoded);
      setLoading(false);
    }

    geocodeAllProperties();
  }, [properties, geocodeAddress, MAPBOX_TOKEN]);

  // Add markers to map
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !mapboxglRef.current || markers.length === 0) return;

    const mapboxgl = mapboxglRef.current;
    const map = mapRef.current;

    // Clear existing markers
    const existingMarkers = document.querySelectorAll('.dashboard-map-marker');
    existingMarkers.forEach(el => el.remove());

    // Add new markers
    markers.forEach((marker) => {
      const status = marker.property.status || 'available';
      const bgColor = status === 'occupied' ? '#3b82f6' : status === 'under_construction' ? '#f97316' : '#22c55e';

      const el = document.createElement('div');
      el.className = 'dashboard-map-marker';
      el.innerHTML = `
        <div style="
          width: 40px;
          height: 40px;
          background: ${bgColor};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          border: 3px solid white;
          cursor: pointer;
          transition: transform 0.2s ease;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedProperty(marker);
      });

      el.addEventListener('mouseenter', () => {
        const inner = el.querySelector('div');
        if (inner) (inner as HTMLElement).style.transform = 'scale(1.15)';
      });

      el.addEventListener('mouseleave', () => {
        const inner = el.querySelector('div');
        if (inner) (inner as HTMLElement).style.transform = 'scale(1)';
      });

      new mapboxgl.Marker(el)
        .setLngLat([marker.lng, marker.lat])
        .addTo(map);
    });

    // Fit bounds
    if (markers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      markers.forEach(m => bounds.extend([m.lng, m.lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 13 });
    }
  }, [mapLoaded, markers]);

  const recenterMap = useCallback(() => {
    if (!mapRef.current || !mapboxglRef.current || markers.length === 0) return;

    const mapboxgl = mapboxglRef.current;
    const map = mapRef.current;
    const bounds = new mapboxgl.LngLatBounds();
    markers.forEach(m => bounds.extend([m.lng, m.lat]));
    map.fitBounds(bounds, { padding: 60, maxZoom: 13 });
  }, [markers]);

  const handleViewProperty = () => {
    if (selectedProperty) {
      router.push(`/dashboard/properties/${selectedProperty.property.id}`);
    }
  };

  // Error state - no token
  if (mapError || !MAPBOX_TOKEN) {
    return (
      <div className="h-full min-h-[400px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-center p-6">
          <FiAlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Map not configured</h3>
          <p className="text-muted-foreground text-sm">
            Add NEXT_PUBLIC_MAPBOX_TOKEN to enable the property map.
          </p>
        </div>
      </div>
    );
  }

  // Always render the map container so it can initialize
  // Show overlays for loading/empty states on top of it
  return (
    <div className="relative h-full min-h-[400px] rounded-xl overflow-hidden border border-gray-200 shadow-lg">
      {/* Map container - always rendered so map can initialize */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Loading overlay */}
      {(loading || !mapLoaded) && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center z-30">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {/* Empty state overlay */}
      {properties.length === 0 && !loading && mapLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center z-30">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiHome className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No properties yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Add your first property to see it on the map.
            </p>
            <button
              onClick={() => router.push('/dashboard/properties')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Add Property
            </button>
          </div>
        </div>
      )}

      {/* Map Controls - only show when map is loaded and not in loading/empty state */}
      {mapLoaded && !loading && properties.length > 0 && (
        <>
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            <button
              onClick={recenterMap}
              className="bg-white px-3 py-2 rounded-lg shadow-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700"
              title="Recenter map"
            >
              <FiMaximize2 className="w-4 h-4" />
              Recenter
            </button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Property Status</p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-600">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs text-gray-600">Occupied</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-xs text-gray-600">Under Construction</span>
              </div>
            </div>
          </div>

          {/* Property count badge */}
          <div className="absolute top-4 right-16 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2">
            <p className="text-sm font-medium text-gray-700">
              {markers.length} {markers.length === 1 ? 'Property' : 'Properties'}
            </p>
          </div>
        </>
      )}

      {/* Selected Property Popup */}
      {selectedProperty && (
        <div className="absolute bottom-4 right-4 z-20 bg-white rounded-xl shadow-2xl p-5 w-80 border border-gray-100">
          <button
            onClick={() => setSelectedProperty(null)}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FiHome className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {selectedProperty.property.address_line1}
              </h3>
              <p className="text-sm text-gray-500">
                {selectedProperty.property.city}, {selectedProperty.property.state} {selectedProperty.property.zip}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                <FiUsers className="w-3.5 h-3.5" />
                <span className="text-xs">Tenants</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {tenantCounts[selectedProperty.property.id] || 0}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                <FiDollarSign className="w-3.5 h-3.5" />
                <span className="text-xs">Rent</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {selectedProperty.property.monthly_rent
                  ? `$${selectedProperty.property.monthly_rent.toLocaleString()}`
                  : '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              {selectedProperty.property.property_type && (
                <span className="text-xs text-gray-500">
                  {propertyTypeLabels[selectedProperty.property.property_type] || selectedProperty.property.property_type}
                </span>
              )}
            </div>
            {selectedProperty.property.status && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                statusColors[selectedProperty.property.status]?.bg || 'bg-gray-100'
              } ${statusColors[selectedProperty.property.status]?.text || 'text-gray-700'}`}>
                {selectedProperty.property.status === 'under_construction'
                  ? 'Under Construction'
                  : selectedProperty.property.status.charAt(0).toUpperCase() + selectedProperty.property.status.slice(1)}
              </span>
            )}
          </div>

          <button
            onClick={handleViewProperty}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            View Property Details
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
