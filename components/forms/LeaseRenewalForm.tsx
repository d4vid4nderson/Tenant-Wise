'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LeaseRenewalData } from '@/lib/prompts/lease-renewal';
import { createClient } from '@/lib/supabase/client';
import { FiHome, FiPlus, FiAlertCircle, FiUser } from 'react-icons/fi';

interface Property {
  id: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
  monthly_rent: number | null;
}

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  property_id: string | null;
  rent_amount: number | null;
  lease_end: string | null;
}

interface LeaseRenewalFormProps {
  onGenerate: (data: LeaseRenewalData) => void;
  loading: boolean;
}

export function LeaseRenewalForm({ onGenerate, loading }: LeaseRenewalFormProps) {
  const supabase = createClient();
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const [formData, setFormData] = useState<LeaseRenewalData>({
    landlordName: '',
    tenantName: '',
    propertyAddress: '',
    city: '',
    state: 'TX',
    zip: '',
    currentLeaseEnd: '',
    newLeaseStart: '',
    newLeaseEnd: '',
    currentRent: 0,
    newRent: 0,
    responseDeadline: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load properties, tenants, and profile in parallel
    const [propertiesResult, tenantsResult, profileResult] = await Promise.all([
      supabase
        .from('properties')
        .select('id, address_line1, address_line2, city, state, zip, monthly_rent')
        .eq('user_id', user.id)
        .order('address_line1'),
      supabase
        .from('tenants')
        .select('id, first_name, last_name, property_id, rent_amount, lease_end')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('last_name'),
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single(),
    ]);

    setProperties(propertiesResult.data || []);
    setTenants(tenantsResult.data || []);
    setLoadingData(false);

    if (profileResult.data?.full_name) {
      setFormData(prev => ({
        ...prev,
        landlordName: profileResult.data.full_name,
      }));
    }
  }

  // Get tenants filtered by selected property
  const filteredTenants = selectedPropertyId
    ? tenants.filter(t => t.property_id === selectedPropertyId)
    : tenants;

  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    const property = properties.find(p => p.id === propertyId);

    if (property) {
      const fullAddress = property.address_line2
        ? `${property.address_line1}, ${property.address_line2}`
        : property.address_line1;
      const currentRent = property.monthly_rent || 0;

      setFormData(prev => ({
        ...prev,
        propertyAddress: fullAddress,
        city: property.city,
        state: property.state,
        zip: property.zip,
        currentRent: currentRent,
        newRent: currentRent,
      }));

      // Check if current tenant belongs to this property
      const currentTenant = tenants.find(t => t.id === selectedTenantId);
      if (currentTenant && currentTenant.property_id !== propertyId) {
        setSelectedTenantId('');
        setFormData(prev => ({ ...prev, tenantName: '' }));
      }

      // Auto-select tenant if property has exactly one tenant
      const propertyTenants = tenants.filter(t => t.property_id === propertyId);
      if (propertyTenants.length === 1) {
        handleTenantChange(propertyTenants[0].id, propertyId);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        propertyAddress: '',
        city: '',
        state: 'TX',
        zip: '',
        currentRent: 0,
        newRent: 0,
      }));
    }
  };

  const handleTenantChange = (tenantId: string, currentPropertyId?: string) => {
    setSelectedTenantId(tenantId);
    const tenant = tenants.find(t => t.id === tenantId);

    if (tenant) {
      setFormData(prev => ({
        ...prev,
        tenantName: `${tenant.first_name} ${tenant.last_name}`,
        currentRent: tenant.rent_amount || prev.currentRent,
        newRent: tenant.rent_amount || prev.newRent,
        currentLeaseEnd: tenant.lease_end || prev.currentLeaseEnd,
      }));

      // Auto-populate lease dates if tenant has lease_end
      if (tenant.lease_end) {
        const currentEnd = new Date(tenant.lease_end);
        const newStart = new Date(currentEnd);
        newStart.setDate(newStart.getDate() + 1);
        const newEnd = new Date(newStart);
        newEnd.setFullYear(newEnd.getFullYear() + 1);
        newEnd.setDate(newEnd.getDate() - 1);

        setFormData(prev => ({
          ...prev,
          currentLeaseEnd: tenant.lease_end!,
          newLeaseStart: newStart.toISOString().split('T')[0],
          newLeaseEnd: newEnd.toISOString().split('T')[0],
        }));
      }

      // Auto-select property if tenant has one
      if (tenant.property_id && !currentPropertyId && !selectedPropertyId) {
        const property = properties.find(p => p.id === tenant.property_id);
        if (property) {
          setSelectedPropertyId(property.id);
          const fullAddress = property.address_line2
            ? `${property.address_line1}, ${property.address_line2}`
            : property.address_line1;
          setFormData(prev => ({
            ...prev,
            propertyAddress: fullAddress,
            city: property.city,
            state: property.state,
            zip: property.zip,
          }));
        }
      }
    } else {
      setFormData(prev => ({ ...prev, tenantName: '' }));
    }
  };

  const handleChange = (field: keyof LeaseRenewalData, value: string | number) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-populate new lease start to day after current lease end
      if (field === 'currentLeaseEnd' && typeof value === 'string' && value) {
        const currentEnd = new Date(value);
        const newStart = new Date(currentEnd);
        newStart.setDate(newStart.getDate() + 1);
        updated.newLeaseStart = newStart.toISOString().split('T')[0];

        // Default new lease end to 1 year later
        const newEnd = new Date(newStart);
        newEnd.setFullYear(newEnd.getFullYear() + 1);
        newEnd.setDate(newEnd.getDate() - 1);
        updated.newLeaseEnd = newEnd.toISOString().split('T')[0];
      }

      return updated;
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onGenerate({
      ...formData,
      propertyId: selectedPropertyId || undefined,
      tenantId: selectedTenantId || undefined,
    } as LeaseRenewalData & { propertyId?: string; tenantId?: string });
  };

  const rentChange = formData.newRent - formData.currentRent;
  const rentChangePercent = formData.currentRent > 0
    ? ((rentChange / formData.currentRent) * 100).toFixed(1)
    : '0';

  return (
    <Card className="p-6 min-h-[600px]">
      <h2 className="text-2xl font-bold mb-6">Lease Renewal Letter</h2>
      <p className="text-gray-600 mb-6">
        Generate a professional lease renewal offer for your tenant
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Landlord Information */}
        <div>
          <label className="block text-sm font-medium mb-1">Your Name (Landlord)</label>
          <Input
            type="text"
            value={formData.landlordName}
            onChange={(e) => handleChange('landlordName', e.target.value)}
            placeholder="John Smith"
            required
          />
        </div>

        {/* Property Selection */}
        <div>
          <label className="block text-sm font-medium mb-1">Property</label>
          {loadingData ? (
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-muted-foreground">
              Loading properties...
            </div>
          ) : properties.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">No properties found</p>
                  <p className="text-sm text-amber-700 mt-1">
                    You need to add a property before creating documents.
                  </p>
                  <Link
                    href="/dashboard/properties/new"
                    className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-amber-700 hover:text-amber-900"
                  >
                    <FiPlus className="w-4 h-4" />
                    Add Your First Property
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <FiHome className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedPropertyId}
                onChange={(e) => handlePropertyChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
                required
              >
                <option value="">Select a property...</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.address_line1}{property.address_line2 ? `, ${property.address_line2}` : ''} - {property.city}, {property.state}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Tenant Selection */}
        <div>
          <label className="block text-sm font-medium mb-1">Tenant</label>
          {loadingData ? (
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-muted-foreground">
              Loading tenants...
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {selectedPropertyId
                  ? 'No tenants assigned to this property'
                  : 'Select a property to see its tenants'}
              </p>
              {selectedPropertyId && (
                <Link
                  href="/dashboard/tenants"
                  className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <FiPlus className="w-4 h-4" />
                  Add a Tenant
                </Link>
              )}
            </div>
          ) : (
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedTenantId}
                onChange={(e) => handleTenantChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
                required
              >
                <option value="">Select a tenant...</option>
                {filteredTenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.first_name} {tenant.last_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Show selected property details */}
        {selectedPropertyId && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-muted-foreground">Selected Property</p>
            <p className="font-medium">{formData.propertyAddress}</p>
            <p className="text-sm text-muted-foreground">{formData.city}, {formData.state} {formData.zip}</p>
          </div>
        )}

        {/* Lease Dates */}
        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium mb-3">Lease Term Details</h3>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Current Lease End Date</label>
              <Input
                type="date"
                value={formData.currentLeaseEnd}
                onChange={(e) => handleChange('currentLeaseEnd', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">New Lease Start Date</label>
              <Input
                type="date"
                value={formData.newLeaseStart}
                onChange={(e) => handleChange('newLeaseStart', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">New Lease End Date</label>
              <Input
                type="date"
                value={formData.newLeaseEnd}
                onChange={(e) => handleChange('newLeaseEnd', e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Rent Details */}
        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium mb-3">Rent Details</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Current Monthly Rent</label>
              <Input
                type="number"
                step="0.01"
                value={formData.currentRent}
                onChange={(e) => handleChange('currentRent', parseFloat(e.target.value) || 0)}
                placeholder="1200.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Proposed New Rent</label>
              <Input
                type="number"
                step="0.01"
                value={formData.newRent}
                onChange={(e) => handleChange('newRent', parseFloat(e.target.value) || 0)}
                placeholder="1250.00"
                required
              />
            </div>
          </div>

          {formData.currentRent > 0 && formData.newRent > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <div className="flex justify-between items-center">
                <span className="font-medium">Rent Change:</span>
                <span className={`text-xl font-bold ${rentChange > 0 ? 'text-amber-600' : rentChange < 0 ? 'text-green-600' : ''}`}>
                  {rentChange > 0 ? '+' : ''}{rentChange !== 0 ? `$${rentChange.toFixed(2)} (${rentChangePercent}%)` : 'No change'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Response Deadline */}
        <div>
          <label className="block text-sm font-medium mb-1">Response Deadline</label>
          <Input
            type="date"
            value={formData.responseDeadline}
            onChange={(e) => handleChange('responseDeadline', e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Recommended: Give tenant at least 2 weeks to respond
          </p>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Generating Document...' : 'Generate Renewal Letter'}
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          This letter is professionally formatted for Texas landlords.
          Always consult with a licensed attorney for legal advice specific to your situation.
        </p>
      </form>
    </Card>
  );
}
