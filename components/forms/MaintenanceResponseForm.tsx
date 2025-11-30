'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { MaintenanceResponseData } from '@/lib/prompts/maintenance';
import { createClient } from '@/lib/supabase/client';
import { FiHome, FiPlus, FiAlertCircle, FiUser } from 'react-icons/fi';

interface Property {
  id: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
}

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  property_id: string | null;
}

interface Contractor {
  id: string;
  name: string;
  company_name: string | null;
  phone: string | null;
  specialty: string;
}

interface MaintenanceResponseFormProps {
  onGenerate: (data: MaintenanceResponseData) => void;
  loading: boolean;
}

const ISSUE_CATEGORIES = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC / Climate Control' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'structural', label: 'Structural' },
  { value: 'pest', label: 'Pest Control' },
  { value: 'other', label: 'Other' },
];

const URGENCY_LEVELS = [
  { value: 'emergency', label: 'Emergency - Immediate attention required' },
  { value: 'urgent', label: 'Urgent - Within 24-48 hours' },
  { value: 'routine', label: 'Routine - Standard scheduling' },
];

export function MaintenanceResponseForm({ onGenerate, loading }: MaintenanceResponseFormProps) {
  const supabase = createClient();
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedContractorId, setSelectedContractorId] = useState<string>('');

  const [formData, setFormData] = useState<MaintenanceResponseData>({
    landlordName: '',
    tenantName: '',
    propertyAddress: '',
    city: '',
    state: 'TX',
    zip: '',
    requestDate: '',
    responseDate: new Date().toISOString().split('T')[0],
    issueDescription: '',
    issueCategory: 'other',
    urgencyLevel: 'routine',
    scheduledDate: '',
    scheduledTime: '',
    contractorName: '',
    contractorPhone: '',
    estimatedCost: undefined,
    tenantResponsibility: false,
    accessInstructions: '',
    landlordPhone: '',
    landlordEmail: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load properties, tenants, contractors, and profile in parallel
    const [propertiesResult, tenantsResult, contractorsResult, profileResult] = await Promise.all([
      supabase
        .from('properties')
        .select('id, address_line1, address_line2, city, state, zip')
        .eq('user_id', user.id)
        .order('address_line1'),
      supabase
        .from('tenants')
        .select('id, first_name, last_name, property_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('last_name'),
      supabase
        .from('contractors')
        .select('id, name, company_name, phone, specialty')
        .eq('user_id', user.id)
        .order('name'),
      supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', user.id)
        .single(),
    ]);

    setProperties(propertiesResult.data || []);
    setTenants(tenantsResult.data || []);
    setContractors(contractorsResult.data || []);
    setLoadingData(false);

    if (profileResult.data) {
      setFormData(prev => ({
        ...prev,
        landlordName: profileResult.data.full_name || '',
        landlordEmail: profileResult.data.email || user.email || '',
        landlordPhone: profileResult.data.phone || '',
      }));
    }
  }

  // Get tenants filtered by selected property
  const filteredTenants = selectedPropertyId
    ? tenants.filter(t => t.property_id === selectedPropertyId)
    : tenants;

  // Get contractors filtered by issue category
  const filteredContractors = formData.issueCategory !== 'other'
    ? contractors.filter(c => c.specialty === formData.issueCategory || c.specialty === 'general')
    : contractors;

  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    const property = properties.find(p => p.id === propertyId);

    if (property) {
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
      }));

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

  const handleContractorChange = (contractorId: string) => {
    setSelectedContractorId(contractorId);
    const contractor = contractors.find(c => c.id === contractorId);

    if (contractor) {
      setFormData(prev => ({
        ...prev,
        contractorName: contractor.company_name
          ? `${contractor.name} (${contractor.company_name})`
          : contractor.name,
        contractorPhone: contractor.phone || '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        contractorName: '',
        contractorPhone: '',
      }));
    }
  };

  const handleChange = (field: keyof MaintenanceResponseData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onGenerate({
      ...formData,
      propertyId: selectedPropertyId || undefined,
      tenantId: selectedTenantId || undefined,
    } as MaintenanceResponseData & { propertyId?: string; tenantId?: string });
  };

  return (
    <Card className="p-6 min-h-[600px]">
      <h2 className="text-2xl font-bold mb-6">Maintenance Response Letter</h2>
      <p className="text-gray-600 mb-6">
        Texas Property Code § 92.052 - Respond to tenant maintenance requests professionally
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Landlord Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div>
            <label className="block text-sm font-medium mb-1">Phone (optional)</label>
            <Input
              type="tel"
              value={formData.landlordPhone || ''}
              onChange={(e) => handleChange('landlordPhone', e.target.value)}
              placeholder="(512) 555-0100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email (optional)</label>
            <Input
              type="email"
              value={formData.landlordEmail || ''}
              onChange={(e) => handleChange('landlordEmail', e.target.value)}
              placeholder="landlord@email.com"
            />
          </div>
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

        {/* Issue Details */}
        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium mb-3">Maintenance Issue Details</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Original Request Date</label>
              <Input
                type="date"
                value={formData.requestDate}
                onChange={(e) => handleChange('requestDate', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Response Date</label>
              <Input
                type="date"
                value={formData.responseDate}
                onChange={(e) => handleChange('responseDate', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">Issue Category</label>
              <Select
                value={formData.issueCategory}
                onChange={(e) => handleChange('issueCategory', e.target.value as MaintenanceResponseData['issueCategory'])}
                options={ISSUE_CATEGORIES}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Urgency Level</label>
              <Select
                value={formData.urgencyLevel}
                onChange={(e) => handleChange('urgencyLevel', e.target.value as MaintenanceResponseData['urgencyLevel'])}
                options={URGENCY_LEVELS}
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Issue Description</label>
            <Textarea
              value={formData.issueDescription}
              onChange={(e) => handleChange('issueDescription', e.target.value)}
              placeholder="Describe the maintenance issue as reported by the tenant..."
              rows={3}
              required
            />
          </div>
        </div>

        {/* Scheduling */}
        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium mb-3">Repair Scheduling</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Scheduled Date (optional)</label>
              <Input
                type="date"
                value={formData.scheduledDate || ''}
                onChange={(e) => handleChange('scheduledDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Scheduled Time (optional)</label>
              <Input
                type="time"
                value={formData.scheduledTime || ''}
                onChange={(e) => handleChange('scheduledTime', e.target.value)}
              />
            </div>
          </div>

          {/* Contractor Selection */}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Contractor (optional)</label>
            {contractors.length > 0 ? (
              <select
                value={selectedContractorId}
                onChange={(e) => handleContractorChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
              >
                <option value="">Select a contractor or enter manually...</option>
                {filteredContractors.map((contractor) => (
                  <option key={contractor.id} value={contractor.id}>
                    {contractor.name}{contractor.company_name ? ` (${contractor.company_name})` : ''} - {contractor.specialty}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">Contractor Name</label>
              <Input
                type="text"
                value={formData.contractorName || ''}
                onChange={(e) => handleChange('contractorName', e.target.value)}
                placeholder="ABC Plumbing Services"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contractor Phone</label>
              <Input
                type="tel"
                value={formData.contractorPhone || ''}
                onChange={(e) => handleChange('contractorPhone', e.target.value)}
                placeholder="(512) 555-0200"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Access Instructions (optional)</label>
            <Textarea
              value={formData.accessInstructions || ''}
              onChange={(e) => handleChange('accessInstructions', e.target.value)}
              placeholder="Instructions for accessing the property for repairs..."
              rows={2}
            />
          </div>
        </div>

        {/* Cost & Responsibility */}
        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium mb-3">Cost & Responsibility</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Estimated Cost (optional)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.estimatedCost || ''}
                onChange={(e) => handleChange('estimatedCost', parseFloat(e.target.value) || 0)}
                placeholder="150.00"
              />
            </div>
            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                id="tenantResponsibility"
                checked={formData.tenantResponsibility}
                onChange={(e) => handleChange('tenantResponsibility', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="tenantResponsibility" className="ml-2 text-sm">
                Tenant is responsible for this repair
              </label>
            </div>
          </div>

          {formData.tenantResponsibility && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
              The letter will indicate this repair is tenant responsibility per the lease agreement.
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Generating Document...' : 'Generate Response Letter'}
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          This response is generated based on Texas Property Code § 92.052.
          Always consult with a licensed attorney for legal advice specific to your situation.
        </p>
      </form>
    </Card>
  );
}
