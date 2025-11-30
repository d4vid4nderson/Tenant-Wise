'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { FiHome, FiMapPin, FiUsers, FiExternalLink, FiAlertCircle, FiMaximize2 } from 'react-icons/fi';

interface Property {
  id: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
  unit_count: number;
  property_type: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface PropertyMapProps {
  properties: Property[];
  tenantCounts: Record<string, number>;
}

interface GeocodedProperty {
  property: Property;
  lat: number;
  lng: number;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Geocode address using Mapbox Geocoding API
async function geocodeAddress(
  address: string,
  city: string,
  state: string,
  zip: string
): Promise<{ lat: number; lng: number } | null> {
  if (!MAPBOX_TOKEN) {
    console.error('Mapbox token not configured');
    return null;
  }

  const query = `${address}, ${city}, ${state} ${zip}`;
  const encoded = encodeURIComponent(query);

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&country=us&types=address&limit=1`
    );
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      console.log(`Geocoded "${query}" successfully:`, { lat, lng });
      return { lat, lng };
    }

    // Fallback: try city/state/zip only
    const fallbackQuery = `${city}, ${state} ${zip}`;
    const fallbackEncoded = encodeURIComponent(fallbackQuery);
    const fallbackResponse = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${fallbackEncoded}.json?access_token=${MAPBOX_TOKEN}&country=us&types=place,postcode&limit=1`
    );
    const fallbackData = await fallbackResponse.json();

    if (fallbackData.features && fallbackData.features.length > 0) {
      const [lng, lat] = fallbackData.features[0].center;
      console.log(`Geocoded fallback "${fallbackQuery}" successfully:`, { lat, lng });
      return { lat, lng };
    }

    console.warn(`Could not geocode: ${query}`);
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

const propertyTypeLabels: Record<string, string> = {
  single_family: 'Single Family',
  duplex: 'Duplex',
  apartment: 'Apartment',
  condo: 'Condo',
  townhouse: 'Townhouse',
  other: 'Other',
};

export default function PropertyMap({ properties, tenantCounts }: PropertyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [markers, setMarkers] = useState<GeocodedProperty[]>([]);
  const [failedProperties, setFailedProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<GeocodedProperty | null>(null);

  // Load mapbox-gl dynamically
  useEffect(() => {
    if (typeof window === 'undefined' || !MAPBOX_TOKEN) return;

    const loadMap = async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      await import('mapbox-gl/dist/mapbox-gl.css');

      mapboxgl.accessToken = MAPBOX_TOKEN;

      if (mapContainerRef.current && !mapRef.current) {
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: process.env.NEXT_PUBLIC_MAPBOX_STYLE || 'mapbox://styles/david4nderson/cmikggsgv006w01qt6zok80ay',
          center: [-100.0, 31.0], // Texas center
          zoom: 5,
        });

        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        mapRef.current = map;

        map.on('load', () => {
          setMapLoaded(true);
        });
      }
    };

    loadMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Geocode properties
  useEffect(() => {
    async function geocodeProperties() {
      if (properties.length === 0) {
        setLoading(false);
        return;
      }

      const geocoded: GeocodedProperty[] = [];
      const failed: Property[] = [];

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
        } else {
          failed.push(property);
        }
      }

      setMarkers(geocoded);
      setFailedProperties(failed);
      setLoading(false);
    }

    geocodeProperties();
  }, [properties]);

  // Recenter map to show all markers
  const recenterMap = useCallback(() => {
    if (!mapRef.current || markers.length === 0) return;

    const mapboxgl = require('mapbox-gl');
    const map = mapRef.current;
    const bounds = new mapboxgl.LngLatBounds();
    markers.forEach(m => bounds.extend([m.lng, m.lat]));
    map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
  }, [markers]);

  // Add markers to map when both map and markers are ready
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || markers.length === 0) return;

    const mapboxgl = require('mapbox-gl');
    const map = mapRef.current;

    // Clear existing markers
    const existingMarkers = document.querySelectorAll('.mapbox-marker');
    existingMarkers.forEach(el => el.remove());

    // Add new markers
    markers.forEach((marker) => {
      const el = document.createElement('div');
      el.className = 'mapbox-marker';
      el.innerHTML = `
        <div style="
          width: 32px;
          height: 32px;
          background: #3b82f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 2px solid white;
          cursor: pointer;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </div>
      `;

      el.addEventListener('click', () => {
        setSelectedProperty(marker);
      });

      new mapboxgl.Marker(el)
        .setLngLat([marker.lng, marker.lat])
        .addTo(map);
    });

    // Fit bounds to show all markers
    if (markers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      markers.forEach(m => bounds.extend([m.lng, m.lat]));
      map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    }
  }, [mapLoaded, markers]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="h-[500px] bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-center p-6">
          <FiAlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Mapbox not configured</h3>
          <p className="text-muted-foreground text-sm">
            Add NEXT_PUBLIC_MAPBOX_TOKEN to your environment variables to enable the map.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[500px] bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-muted-foreground">Locating {properties.length} properties...</p>
        </div>
      </div>
    );
  }

  if (markers.length === 0 && properties.length === 0) {
    return (
      <div className="h-[500px] bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <FiMapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-muted-foreground">No properties to display on the map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative h-[500px] rounded-xl overflow-hidden border border-gray-200 shadow-lg">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Recenter Button */}
        <button
          onClick={recenterMap}
          className="absolute top-4 left-4 z-10 bg-white px-3 py-2 rounded-lg shadow-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700"
          title="Recenter map to show all properties"
        >
          <FiMaximize2 className="w-4 h-4" />
          Recenter
        </button>

        {/* Popup for selected property */}
        {selectedProperty && (
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-xl p-4 max-w-[300px] z-10">
            <button
              onClick={() => setSelectedProperty(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
            <div className="flex items-center gap-2 mb-2">
              <FiHome className="w-4 h-4 text-blue-600" />
              <span className="font-semibold">{selectedProperty.property.address_line1}</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              {selectedProperty.property.city}, {selectedProperty.property.state}{' '}
              {selectedProperty.property.zip}
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
              <span className="flex items-center gap-1">
                <FiHome className="w-3 h-3" />
                {selectedProperty.property.unit_count}{' '}
                {selectedProperty.property.unit_count === 1 ? 'unit' : 'units'}
              </span>
              <span className="flex items-center gap-1">
                <FiUsers className="w-3 h-3" />
                {tenantCounts[selectedProperty.property.id] || 0} tenants
              </span>
            </div>
            {selectedProperty.property.property_type && (
              <p className="text-xs text-gray-500 mb-3">
                {propertyTypeLabels[selectedProperty.property.property_type] ||
                  selectedProperty.property.property_type}
              </p>
            )}
            <Link
              href={`/dashboard/properties/${selectedProperty.property.id}`}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              View Details
              <FiExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>

      {/* Warning for properties that couldn't be geocoded */}
      {failedProperties.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">
                {failedProperties.length} propert{failedProperties.length === 1 ? 'y' : 'ies'}{' '}
                couldn&apos;t be located
              </p>
              <ul className="mt-2 space-y-1">
                {failedProperties.map((p) => (
                  <li key={p.id} className="text-sm text-amber-600">
                    • {p.address_line1}, {p.city}, {p.state} {p.zip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
