'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { FiMapPin, FiX } from 'react-icons/fi';

interface AddressResult {
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
  full_address: string;
  latitude: number;
  longitude: number;
}

interface AddressAutofillProps {
  onSelect: (address: AddressResult) => void;
  placeholder?: string;
  className?: string;
}

interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  properties: {
    accuracy?: string;
  };
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
  address?: string;
  center: [number, number];
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function AddressAutofill({ onSelect, placeholder = 'Enter address...', className = '' }: AddressAutofillProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddresses = useCallback(async (searchQuery: string) => {
    console.log('AddressAutofill: searching for', searchQuery, 'token exists:', !!MAPBOX_TOKEN);

    if (!MAPBOX_TOKEN) {
      console.warn('AddressAutofill: No Mapbox token configured');
      setSuggestions([]);
      return;
    }

    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);

    try {
      const encoded = encodeURIComponent(searchQuery);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&country=us&types=address&limit=5&autocomplete=true`;
      console.log('AddressAutofill: fetching', url.replace(MAPBOX_TOKEN, 'TOKEN_HIDDEN'));

      const response = await fetch(url);
      const data = await response.json();

      console.log('AddressAutofill: got', data.features?.length || 0, 'results');

      if (data.features) {
        setSuggestions(data.features);
        setIsOpen(true);
      } else if (data.message) {
        console.error('AddressAutofill: API error:', data.message);
      }
    } catch (error) {
      console.error('Address search error:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedAddress(null);

    // Debounce the search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchAddresses(value);
    }, 300);
  };

  const parseAddress = (feature: MapboxFeature): AddressResult => {
    // Extract components from the feature context
    let city = '';
    let state = '';
    let zip = '';
    let address_line1 = feature.text || '';

    // If there's a street number, prepend it
    if (feature.address) {
      address_line1 = `${feature.address} ${address_line1}`;
    }

    // Parse context for city, state, zip
    if (feature.context) {
      for (const ctx of feature.context) {
        if (ctx.id.startsWith('place')) {
          city = ctx.text;
        } else if (ctx.id.startsWith('region')) {
          // Convert state to abbreviation if needed
          state = ctx.short_code?.replace('US-', '') || ctx.text;
        } else if (ctx.id.startsWith('postcode')) {
          zip = ctx.text;
        }
      }
    }

    return {
      address_line1,
      address_line2: '',
      city,
      state,
      zip,
      full_address: feature.place_name,
      latitude: feature.center[1],
      longitude: feature.center[0],
    };
  };

  const handleSelect = (feature: MapboxFeature) => {
    const address = parseAddress(feature);
    setQuery(address.address_line1);
    setSelectedAddress(address.full_address);
    setIsOpen(false);
    setSuggestions([]);
    onSelect(address);
  };

  const handleClear = () => {
    setQuery('');
    setSelectedAddress(null);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  if (!MAPBOX_TOKEN) {
    return (
      <input
        type="text"
        placeholder={placeholder}
        className={`w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      />
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <FiX className="w-4 h-4" />
          </button>
        )}
      </div>

      {selectedAddress && (
        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
          <FiMapPin className="w-3 h-3" />
          {selectedAddress}
        </p>
      )}

      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {loading && (
            <div className="px-4 py-2 text-sm text-gray-500">Searching...</div>
          )}
          {suggestions.map((feature) => (
            <button
              key={feature.id}
              type="button"
              onClick={() => handleSelect(feature)}
              className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-start gap-2">
                <FiMapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{feature.text}</p>
                  <p className="text-xs text-gray-500">{feature.place_name}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
