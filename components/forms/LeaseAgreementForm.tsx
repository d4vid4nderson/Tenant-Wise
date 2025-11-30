'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { LeaseAgreementData } from '@/lib/prompts/lease-agreement';
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
  email: string | null;
  phone: string | null;
}

interface LeaseAgreementFormProps {
  onGenerate: (data: LeaseAgreementData) => void;
  loading: boolean;
}

const UTILITY_OPTIONS = [
  { value: 'electricity', label: 'Electricity' },
  { value: 'gas', label: 'Gas' },
  { value: 'water', label: 'Water' },
  { value: 'sewer', label: 'Sewer' },
  { value: 'trash', label: 'Trash' },
  { value: 'internet', label: 'Internet' },
  { value: 'cable', label: 'Cable TV' },
];

export function LeaseAgreementForm({ onGenerate, loading }: LeaseAgreementFormProps) {
  const supabase = createClient();
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const [formData, setFormData] = useState<LeaseAgreementData>({
    landlordName: '',
    landlordAddress: '',
    landlordCity: '',
    landlordState: 'TX',
    landlordZip: '',
    landlordPhone: '',
    landlordEmail: '',
    tenantName: '',
    tenantPhone: '',
    tenantEmail: '',
    propertyAddress: '',
    city: '',
    state: 'TX',
    zip: '',
    unitNumber: '',
    leaseStartDate: '',
    leaseEndDate: '',
    monthlyRent: 0,
    securityDeposit: 0,
    rentDueDay: 1,
    lateFeeAmount: 50,
    lateFeeGracePeriod: 5,
    petsAllowed: false,
    petDeposit: 0,
    petRent: 0,
    maxOccupants: 2,
    utilitiesIncluded: [],
    parkingSpaces: 1,
    additionalTerms: '',
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
        .select('id, first_name, last_name, property_id, email, phone')
        .eq('user_id', user.id)
        .order('last_name'),
      supabase
        .from('profiles')
        .select('full_name, email, phone, landlord_address_line1, landlord_city, landlord_state, landlord_zip')
        .eq('id', user.id)
        .single(),
    ]);

    setProperties(propertiesResult.data || []);
    setTenants(tenantsResult.data || []);
    setLoadingData(false);

    if (profileResult.data) {
      setFormData(prev => ({
        ...prev,
        landlordName: profileResult.data.full_name || '',
        landlordEmail: profileResult.data.email || user.email || '',
        landlordPhone: profileResult.data.phone || '',
        landlordAddress: profileResult.data.landlord_address_line1 || '',
        landlordCity: profileResult.data.landlord_city || '',
        landlordState: profileResult.data.landlord_state || 'TX',
        landlordZip: profileResult.data.landlord_zip || '',
      }));
    }
  }

  // Get tenants filtered by selected property (show all for new leases)
  const filteredTenants = selectedPropertyId
    ? tenants.filter(t => t.property_id === selectedPropertyId || !t.property_id)
    : tenants;

  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    const property = properties.find(p => p.id === propertyId);

    if (property) {
      const fullAddress = property.address_line2
        ? `${property.address_line1}, ${property.address_line2}`
        : property.address_line1;
      const monthlyRent = property.monthly_rent || 0;

      setFormData(prev => ({
        ...prev,
        propertyAddress: fullAddress,
        city: property.city,
        state: property.state,
        zip: property.zip,
        monthlyRent: monthlyRent,
        securityDeposit: monthlyRent,
      }));

      // Check if current tenant belongs to this property
      const currentTenant = tenants.find(t => t.id === selectedTenantId);
      if (currentTenant && currentTenant.property_id && currentTenant.property_id !== propertyId) {
        setSelectedTenantId('');
        setFormData(prev => ({ ...prev, tenantName: '', tenantPhone: '', tenantEmail: '' }));
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
        monthlyRent: 0,
        securityDeposit: 0,
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
        tenantPhone: tenant.phone || '',
        tenantEmail: tenant.email || '',
      }));

      // Auto-select property if tenant has one
      if (tenant.property_id && !currentPropertyId && !selectedPropertyId) {
        const property = properties.find(p => p.id === tenant.property_id);
        if (property) {
          setSelectedPropertyId(property.id);
          const fullAddress = property.address_line2
            ? `${property.address_line1}, ${property.address_line2}`
            : property.address_line1;
          const monthlyRent = property.monthly_rent || 0;
          setFormData(prev => ({
            ...prev,
            propertyAddress: fullAddress,
            city: property.city,
            state: property.state,
            zip: property.zip,
            monthlyRent: monthlyRent,
            securityDeposit: monthlyRent,
          }));
        }
      }
    } else {
      setFormData(prev => ({ ...prev, tenantName: '', tenantPhone: '', tenantEmail: '' }));
    }
  };

  const handleChange = (field: keyof LeaseAgreementData, value: string | number | boolean | string[]) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate lease end date (1 year from start)
      if (field === 'leaseStartDate' && typeof value === 'string' && value) {
        const startDate = new Date(value);
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);
        endDate.setDate(endDate.getDate() - 1);
        updated.leaseEndDate = endDate.toISOString().split('T')[0];
      }

      return updated;
    });
  };

  const handleUtilityToggle = (utility: string) => {
    const current = formData.utilitiesIncluded;
    if (current.includes(utility)) {
      handleChange('utilitiesIncluded', current.filter(u => u !== utility));
    } else {
      handleChange('utilitiesIncluded', [...current, utility]);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onGenerate({
      ...formData,
      propertyId: selectedPropertyId || undefined,
      tenantId: selectedTenantId || undefined,
    } as LeaseAgreementData & { propertyId?: string; tenantId?: string });
  };

  return (
    <Card className="p-6 min-h-[600px]">
      <h2 className="text-2xl font-bold mb-6">Residential Lease Agreement</h2>
      <p className="text-gray-600 mb-6">
        Texas Property Code Chapter 92 - Generate a comprehensive lease agreement
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Landlord Information */}
        <div className="border-b pb-6">
          <h3 className="font-medium mb-4 text-lg">Landlord Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Landlord Name</label>
              <Input
                type="text"
                value={formData.landlordName}
                onChange={(e) => handleChange('landlordName', e.target.value)}
                placeholder="John Smith"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone (optional)</label>
              <Input
                type="tel"
                value={formData.landlordPhone || ''}
                onChange={(e) => handleChange('landlordPhone', e.target.value)}
                placeholder="(512) 555-0100"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Email (optional)</label>
            <Input
              type="email"
              value={formData.landlordEmail || ''}
              onChange={(e) => handleChange('landlordEmail', e.target.value)}
              placeholder="landlord@email.com"
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Landlord Address</label>
            <Input
              type="text"
              value={formData.landlordAddress}
              onChange={(e) => handleChange('landlordAddress', e.target.value)}
              placeholder="456 Main Street"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <Input
                type="text"
                value={formData.landlordCity}
                onChange={(e) => handleChange('landlordCity', e.target.value)}
                placeholder="Austin"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State</label>
              <Input
                type="text"
                value={formData.landlordState}
                onChange={(e) => handleChange('landlordState', e.target.value)}
                placeholder="TX"
                maxLength={2}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ZIP Code</label>
              <Input
                type="text"
                value={formData.landlordZip}
                onChange={(e) => handleChange('landlordZip', e.target.value)}
                placeholder="78701"
                required
              />
            </div>
          </div>
        </div>

        {/* Property Selection */}
        <div className="border-b pb-6">
          <h3 className="font-medium mb-4 text-lg">Rental Property</h3>
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

          {selectedPropertyId && (
            <div className="p-3 bg-gray-50 rounded-lg mt-4">
              <p className="text-sm text-muted-foreground">Selected Property</p>
              <p className="font-medium">{formData.propertyAddress}</p>
              <p className="text-sm text-muted-foreground">{formData.city}, {formData.state} {formData.zip}</p>
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Unit # (optional)</label>
            <Input
              type="text"
              value={formData.unitNumber || ''}
              onChange={(e) => handleChange('unitNumber', e.target.value)}
              placeholder="101"
            />
          </div>
        </div>

        {/* Tenant Selection */}
        <div className="border-b pb-6">
          <h3 className="font-medium mb-4 text-lg">Tenant Information</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Tenant</label>
            {loadingData ? (
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-muted-foreground">
                Loading tenants...
              </div>
            ) : tenants.length === 0 ? (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  No tenants found. Add a tenant first or enter details manually below.
                </p>
                <Link
                  href="/dashboard/tenants"
                  className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <FiPlus className="w-4 h-4" />
                  Add a Tenant
                </Link>
              </div>
            ) : (
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={selectedTenantId}
                  onChange={(e) => handleTenantChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
                >
                  <option value="">Select a tenant or enter manually...</option>
                  {filteredTenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.first_name} {tenant.last_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {tenants.length > 0 && (
              <Link
                href="/dashboard/tenants"
                className="inline-flex items-center gap-1.5 mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <FiPlus className="w-4 h-4" />
                Add New Tenant
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tenant Name(s)</label>
              <Input
                type="text"
                value={formData.tenantName}
                onChange={(e) => handleChange('tenantName', e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone (optional)</label>
              <Input
                type="tel"
                value={formData.tenantPhone || ''}
                onChange={(e) => handleChange('tenantPhone', e.target.value)}
                placeholder="(512) 555-0200"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Email (optional)</label>
            <Input
              type="email"
              value={formData.tenantEmail || ''}
              onChange={(e) => handleChange('tenantEmail', e.target.value)}
              placeholder="tenant@email.com"
            />
          </div>
        </div>

        {/* Lease Terms */}
        <div className="border-b pb-6">
          <h3 className="font-medium mb-4 text-lg">Lease Terms</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Lease Start Date</label>
              <Input
                type="date"
                value={formData.leaseStartDate}
                onChange={(e) => handleChange('leaseStartDate', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Lease End Date</label>
              <Input
                type="date"
                value={formData.leaseEndDate}
                onChange={(e) => handleChange('leaseEndDate', e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Financial Terms */}
        <div className="border-b pb-6">
          <h3 className="font-medium mb-4 text-lg">Financial Terms</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Monthly Rent</label>
              <Input
                type="number"
                step="0.01"
                value={formData.monthlyRent}
                onChange={(e) => handleChange('monthlyRent', parseFloat(e.target.value) || 0)}
                placeholder="1500.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Security Deposit</label>
              <Input
                type="number"
                step="0.01"
                value={formData.securityDeposit}
                onChange={(e) => handleChange('securityDeposit', parseFloat(e.target.value) || 0)}
                placeholder="1500.00"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">Rent Due Day</label>
              <Input
                type="number"
                min="1"
                max="31"
                value={formData.rentDueDay}
                onChange={(e) => handleChange('rentDueDay', parseInt(e.target.value) || 1)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Late Fee Amount</label>
              <Input
                type="number"
                step="0.01"
                value={formData.lateFeeAmount}
                onChange={(e) => handleChange('lateFeeAmount', parseFloat(e.target.value) || 0)}
                placeholder="50.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Grace Period (days)</label>
              <Input
                type="number"
                min="0"
                max="30"
                value={formData.lateFeeGracePeriod}
                onChange={(e) => handleChange('lateFeeGracePeriod', parseInt(e.target.value) || 0)}
                required
              />
            </div>
          </div>
        </div>

        {/* Occupancy & Parking */}
        <div className="border-b pb-6">
          <h3 className="font-medium mb-4 text-lg">Occupancy & Parking</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Maximum Occupants</label>
              <Input
                type="number"
                min="1"
                value={formData.maxOccupants}
                onChange={(e) => handleChange('maxOccupants', parseInt(e.target.value) || 1)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Parking Spaces</label>
              <Input
                type="number"
                min="0"
                value={formData.parkingSpaces}
                onChange={(e) => handleChange('parkingSpaces', parseInt(e.target.value) || 0)}
                required
              />
            </div>
          </div>
        </div>

        {/* Pet Policy */}
        <div className="border-b pb-6">
          <h3 className="font-medium mb-4 text-lg">Pet Policy</h3>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="petsAllowed"
              checked={formData.petsAllowed}
              onChange={(e) => handleChange('petsAllowed', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="petsAllowed" className="text-sm font-medium">
              Pets are allowed
            </label>
          </div>

          {formData.petsAllowed && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Pet Deposit</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.petDeposit || ''}
                  onChange={(e) => handleChange('petDeposit', parseFloat(e.target.value) || 0)}
                  placeholder="200.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Pet Rent</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.petRent || ''}
                  onChange={(e) => handleChange('petRent', parseFloat(e.target.value) || 0)}
                  placeholder="25.00"
                />
              </div>
            </div>
          )}
        </div>

        {/* Utilities */}
        <div className="border-b pb-6">
          <h3 className="font-medium mb-4 text-lg">Utilities Included by Landlord</h3>
          <p className="text-sm text-gray-600 mb-3">Select utilities that are included in the rent:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {UTILITY_OPTIONS.map((utility) => (
              <label key={utility.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.utilitiesIncluded.includes(utility.value)}
                  onChange={() => handleUtilityToggle(utility.value)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">{utility.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Additional Terms */}
        <div>
          <h3 className="font-medium mb-4 text-lg">Additional Terms (optional)</h3>
          <Textarea
            value={formData.additionalTerms || ''}
            onChange={(e) => handleChange('additionalTerms', e.target.value)}
            placeholder="Enter any additional terms or conditions..."
            rows={4}
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Generating Document...' : 'Generate Lease Agreement'}
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          This lease agreement is generated based on Texas Property Code Chapter 92.
          Always consult with a licensed attorney for legal advice specific to your situation.
        </p>
      </form>
    </Card>
  );
}
