'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/Modal';
import AddressAutofill from '@/components/AddressAutofill';
import { FiHome, FiPlus, FiSearch, FiMapPin, FiUsers, FiEdit2, FiTrash2, FiX, FiCheck, FiAlertCircle, FiList, FiMap, FiGrid, FiDollarSign, FiUpload } from 'react-icons/fi';

// Dynamic import for the map component (client-side only)
const PropertyMap = dynamic(() => import('@/components/PropertyMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-gray-100 rounded-xl flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  ),
});

interface Property {
  id: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
  unit_count: number;
  property_type: string | null;
  notes: string | null;
  monthly_rent: number | null;
  market_rent: number | null;
  image_url: string | null;
  created_at: string;
}

interface Tenant {
  id: string;
  property_id: string | null;
}

const propertyTypeLabels: Record<string, string> = {
  single_family: 'Single Family',
  duplex: 'Duplex',
  apartment: 'Apartment',
  condo: 'Condo',
  townhouse: 'Townhouse',
  other: 'Other',
};

const propertyTypeColors: Record<string, string> = {
  single_family: 'bg-cyan-100 text-cyan-700',
  duplex: 'bg-blue-100 text-blue-700',
  apartment: 'bg-indigo-100 text-indigo-700',
  condo: 'bg-purple-100 text-purple-700',
  townhouse: 'bg-pink-100 text-pink-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function PropertiesPage() {
  const supabase = createClient();
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'card' | 'map'>('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state for new property
  const [formData, setFormData] = useState({
    address_line1: '',
    address_line2: '',
    city: '',
    state: 'TX',
    zip: '',
    unit_count: 1,
    property_type: '',
    notes: '',
    latitude: null as number | null,
    longitude: null as number | null,
    monthly_rent: '' as string | number,
    market_rent: '' as string | number,
    image_url: null as string | null,
  });
  const [saving, setSaving] = useState(false);
  const [addressKey, setAddressKey] = useState(0); // For resetting AddressAutofill
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null; address: string; tenantCount: number }>({
    show: false,
    id: null,
    address: '',
    tenantCount: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [propertiesRes, tenantsRes] = await Promise.all([
      supabase
        .from('properties')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('tenants')
        .select('id, property_id')
        .eq('user_id', user.id),
    ]);

    setProperties(propertiesRes.data || []);
    setTenants(tenantsRes.data || []);
    setLoading(false);
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const getTenantCount = (propertyId: string) => {
    return tenants.filter(t => t.property_id === propertyId).length;
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = searchQuery === '' ||
      property.address_line1.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === '' || property.property_type === filterType;
    return matchesSearch && matchesType;
  });

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image to Supabase Storage
  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error } = await supabase.storage
      .from('property-images')
      .upload(fileName, file);

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('property-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let imageUrl = null;

      // Upload image if one was selected
      if (imageFile) {
        setUploadingImage(true);
        imageUrl = await uploadImage(imageFile);
        setUploadingImage(false);
      }

      const propertyData = {
        ...formData,
        monthly_rent: formData.monthly_rent ? parseFloat(formData.monthly_rent.toString()) : null,
        market_rent: formData.market_rent ? parseFloat(formData.market_rent.toString()) : null,
        image_url: imageUrl,
      };

      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propertyData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add property');
      }

      setProperties([result.data, ...properties]);
      setShowAddModal(false);
      setFormData({
        address_line1: '',
        address_line2: '',
        city: '',
        state: 'TX',
        zip: '',
        unit_count: 1,
        property_type: '',
        notes: '',
        latitude: null,
        longitude: null,
        monthly_rent: '',
        market_rent: '',
        image_url: null,
      });
      setImageFile(null);
      setImagePreview(null);
      setAddressKey(prev => prev + 1); // Reset AddressAutofill
      showMessage('success', 'Property added successfully!');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Failed to add property');
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  const handleDeleteProperty = (id: string) => {
    const property = properties.find(p => p.id === id);
    const tenantCount = getTenantCount(id);
    setDeleteConfirm({
      show: true,
      id,
      address: property?.address_line1 || '',
      tenantCount,
    });
  };

  const confirmDeleteProperty = async () => {
    if (!deleteConfirm.id) return;

    try {
      const response = await fetch(`/api/properties/${deleteConfirm.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete property');
      }

      setProperties(properties.filter(p => p.id !== deleteConfirm.id));
      showMessage('success', 'Property deleted successfully');
    } catch (error) {
      showMessage('error', 'Failed to delete property');
    } finally {
      setDeleteConfirm({ show: false, id: null, address: '', tenantCount: 0 });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 -mx-8 -mt-8 px-8 pt-8 pb-12 mb-8 rounded-b-3xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Properties</h1>
            <p className="text-emerald-100">Manage your rental properties</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors font-medium shadow-lg"
          >
            <FiPlus className="w-5 h-5" />
            Add Property
          </button>
        </div>
      </div>

      {/* Message Toast */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <FiCheck className="w-5 h-5" /> : <FiAlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8 -mt-6">
        <Card className="border-2 border-cyan-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-50 rounded-lg">
                <FiHome className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-cyan-600">{properties.length}</p>
                <p className="text-sm text-muted-foreground">Total Properties</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <FiUsers className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-600">{tenants.length}</p>
                <p className="text-sm text-muted-foreground">Total Tenants</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-indigo-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 rounded-lg">
                <FiMapPin className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-indigo-600">
                  {properties.reduce((sum, p) => sum + (p.unit_count || 1), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Units</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search, Filter, and View Toggle */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="single_family">Single Family</option>
          <option value="duplex">Duplex</option>
          <option value="apartment">Apartment</option>
          <option value="condo">Condo</option>
          <option value="townhouse">Townhouse</option>
          <option value="other">Other</option>
        </select>

        {/* View Toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FiList className="w-4 h-4" />
            List
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={`flex items-center gap-2 px-4 py-2 transition-colors ${
              viewMode === 'card'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FiGrid className="w-4 h-4" />
            Cards
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-2 px-4 py-2 transition-colors ${
              viewMode === 'map'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FiMap className="w-4 h-4" />
            Map
          </button>
        </div>
      </div>

      {/* Properties Display */}
      {filteredProperties.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiHome className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2">
              {properties.length === 0 ? 'No properties yet' : 'No properties match your search'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {properties.length === 0
                ? 'Add your first property to get started managing your rentals.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {properties.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <FiPlus className="w-5 h-5" />
                Add Your First Property
              </button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'map' ? (
        /* Map View */
        <PropertyMap
          properties={filteredProperties}
          tenantCounts={Object.fromEntries(
            filteredProperties.map(p => [p.id, getTenantCount(p.id)])
          )}
        />
      ) : viewMode === 'card' ? (
        /* Card View */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              tenantCount={getTenantCount(property.id)}
              onDelete={() => handleDeleteProperty(property.id)}
            />
          ))}
        </div>
      ) : (
        /* List View - Table Layout */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tenants</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Rent</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProperties.map((property) => (
                    <tr key={property.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/properties/${property.id}`} className="flex items-center gap-3">
                          {property.image_url ? (
                            <img src={property.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                              <FiHome className="w-5 h-5 text-blue-300" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 hover:text-blue-600">{property.address_line1}</p>
                            <p className="text-sm text-gray-500">{property.city}, {property.state} {property.zip}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        {property.property_type ? (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${propertyTypeColors[property.property_type] || 'bg-gray-100 text-gray-700'}`}>
                            {propertyTypeLabels[property.property_type] || property.property_type}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900">{property.unit_count}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <FiUsers className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">{getTenantCount(property.id)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {property.monthly_rent ? (
                          <span className="font-medium text-green-600">${property.monthly_rent.toLocaleString()}/mo</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/properties/${property.id}`}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <FiEdit2 className="w-4 h-4 text-gray-500" />
                          </Link>
                          <button
                            onClick={() => handleDeleteProperty(property.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <FiTrash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Property Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-semibold text-white">Add New Property</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProperty} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Street Address *</label>
                <AddressAutofill
                  key={addressKey}
                  placeholder="Start typing an address..."
                  onSelect={(address) => {
                    setFormData({
                      ...formData,
                      address_line1: address.address_line1,
                      city: address.city,
                      state: address.state || 'TX',
                      zip: address.zip,
                      latitude: address.latitude,
                      longitude: address.longitude,
                    });
                  }}
                />
                {!formData.address_line1 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Select an address from the dropdown, or type manually below
                  </p>
                )}
                {/* Manual entry fallback */}
                {formData.address_line1 === '' && (
                  <input
                    type="text"
                    value={formData.address_line1}
                    onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                    placeholder="Or enter address manually"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Unit/Apt # (optional)</label>
                <input
                  type="text"
                  value={formData.address_line2}
                  onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Apt 4B"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className={`w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formData.latitude ? 'bg-gray-50' : ''}`}
                    placeholder="Austin"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">State</label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className={`w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formData.latitude ? 'bg-gray-50' : ''}`}
                  >
                    <option value="TX">Texas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">ZIP Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    className={`w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formData.latitude ? 'bg-gray-50' : ''}`}
                    placeholder="78701"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Unit Count</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.unit_count}
                    onChange={(e) => setFormData({ ...formData, unit_count: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Property Type</label>
                  <select
                    value={formData.property_type}
                    onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select type...</option>
                    <option value="single_family">Single Family</option>
                    <option value="duplex">Duplex</option>
                    <option value="apartment">Apartment</option>
                    <option value="condo">Condo</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Monthly Rent</label>
                  <div className="relative">
                    <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.monthly_rent}
                      onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1500.00"
                    />
                  </div>
                </div>
              </div>

              {/* Property Image Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">Property Image (optional)</label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Property preview"
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <FiUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <span className="text-sm text-gray-500">Click to upload an image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Any additional notes about this property..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingImage}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {uploadingImage ? 'Uploading image...' : saving ? 'Adding...' : 'Add Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, id: null, address: '', tenantCount: 0 })}
        onConfirm={confirmDeleteProperty}
        title="Delete Property"
        message={
          deleteConfirm.tenantCount > 0
            ? `This property has ${deleteConfirm.tenantCount} tenant(s). Deleting it will unlink them from this property. Continue?`
            : `Are you sure you want to delete "${deleteConfirm.address}"?`
        }
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

function PropertyCard({
  property,
  tenantCount,
  onDelete,
}: {
  property: Property;
  tenantCount: number;
  onDelete: () => void;
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-200 overflow-hidden">
      {/* Property Image */}
      {property.image_url ? (
        <div className="h-40 w-full overflow-hidden">
          <img
            src={property.image_url}
            alt={property.address_line1}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="h-32 w-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <FiHome className="w-12 h-12 text-blue-300" />
        </div>
      )}

      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {property.property_type && (
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${propertyTypeColors[property.property_type] || 'bg-gray-100 text-gray-700'}`}>
                {propertyTypeLabels[property.property_type] || property.property_type}
              </span>
            )}
            {property.monthly_rent && (
              <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">
                ${property.monthly_rent.toLocaleString()}/mo
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`/dashboard/properties/${property.id}`}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit"
            >
              <FiEdit2 className="w-4 h-4 text-gray-500" />
            </Link>
            <button
              onClick={onDelete}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <FiTrash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>

        <Link href={`/dashboard/properties/${property.id}`}>
          <h3 className="font-semibold text-lg mb-1 hover:text-blue-600 transition-colors">
            {property.address_line1}
          </h3>
          {property.address_line2 && (
            <p className="text-sm text-muted-foreground mb-1">{property.address_line2}</p>
          )}
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <FiMapPin className="w-4 h-4" />
            {property.city}, {property.state} {property.zip}
          </p>
        </Link>

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm">
            <FiHome className="w-4 h-4 text-gray-400" />
            <span>{property.unit_count} {property.unit_count === 1 ? 'unit' : 'units'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FiUsers className="w-4 h-4 text-gray-400" />
            <span>{tenantCount} {tenantCount === 1 ? 'tenant' : 'tenants'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
