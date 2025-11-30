'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { SecurityDepositReturnData } from '@/lib/prompts/deposit-return';
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
  security_deposit: number | null;
}

interface DepositReturnFormProps {
  onGenerate: (data: SecurityDepositReturnData) => void;
  loading: boolean;
}

interface Deduction {
  description: string;
  amount: number;
  category: string;
}

const DEDUCTION_CATEGORIES = [
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'repair', label: 'Repair' },
  { value: 'replacement', label: 'Replacement' },
  { value: 'unpaid_rent', label: 'Unpaid Rent' },
  { value: 'other', label: 'Other' },
];

export function DepositReturnForm({ onGenerate, loading }: DepositReturnFormProps) {
  const supabase = createClient();
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const [formData, setFormData] = useState<Omit<SecurityDepositReturnData, 'deductions'>>({
    landlordName: '',
    tenantName: '',
    propertyAddress: '',
    city: '',
    state: 'TX',
    zip: '',
    moveOutDate: '',
    depositAmount: 0,
    forwardingAddress: '',
  });

  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [newDeduction, setNewDeduction] = useState<Deduction>({
    description: '',
    amount: 0,
    category: 'repair',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load properties, tenants (including inactive for deposit returns), and profile in parallel
    const [propertiesResult, tenantsResult, profileResult] = await Promise.all([
      supabase
        .from('properties')
        .select('id, address_line1, address_line2, city, state, zip')
        .eq('user_id', user.id)
        .order('address_line1'),
      supabase
        .from('tenants')
        .select('id, first_name, last_name, property_id, security_deposit')
        .eq('user_id', user.id)
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
        setFormData(prev => ({ ...prev, tenantName: '', depositAmount: 0 }));
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
        depositAmount: tenant.security_deposit || prev.depositAmount,
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

  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addDeduction = () => {
    if (newDeduction.description && newDeduction.amount > 0) {
      setDeductions([...deductions, { ...newDeduction }]);
      setNewDeduction({ description: '', amount: 0, category: 'repair' });
    }
  };

  const removeDeduction = (index: number) => {
    const updated = [...deductions];
    updated.splice(index, 1);
    setDeductions(updated);
  };

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const refundAmount = Math.max(0, formData.depositAmount - totalDeductions);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Convert deductions to the format expected by the prompt
    const promptDeductions = deductions.map(d => ({
      description: `${d.description} (${DEDUCTION_CATEGORIES.find(c => c.value === d.category)?.label || d.category})`,
      amount: d.amount,
    }));

    onGenerate({
      ...formData,
      deductions: promptDeductions,
      propertyId: selectedPropertyId || undefined,
      tenantId: selectedTenantId || undefined,
    } as SecurityDepositReturnData & { propertyId?: string; tenantId?: string });
  };

  // Calculate days since move-out for deadline warning
  const moveOutDate = formData.moveOutDate ? new Date(formData.moveOutDate) : null;
  const today = new Date();
  const daysSinceMoveOut = moveOutDate
    ? Math.floor((today.getTime() - moveOutDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const daysRemaining = 30 - daysSinceMoveOut;

  return (
    <Card className="p-6 min-h-[600px]">
      <h2 className="text-2xl font-bold mb-6">Security Deposit Return Letter</h2>
      <p className="text-gray-600 mb-6">
        Texas Property Code § 92.103 - Return deposit within 30 days with itemized deductions
      </p>

      {moveOutDate && daysSinceMoveOut > 0 && (
        <div className={`mb-6 p-4 rounded-lg ${
          daysRemaining <= 7 ? 'bg-red-50 border border-red-200' :
          daysRemaining <= 14 ? 'bg-amber-50 border border-amber-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <p className={`font-medium ${
            daysRemaining <= 7 ? 'text-red-800' :
            daysRemaining <= 14 ? 'text-amber-800' :
            'text-blue-800'
          }`}>
            {daysRemaining > 0
              ? `${daysRemaining} days remaining to return deposit (Texas 30-day requirement)`
              : `DEADLINE PASSED: ${Math.abs(daysRemaining)} days overdue - Risk of 3x deposit penalty!`
            }
          </p>
        </div>
      )}

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
          <label className="block text-sm font-medium mb-1">Rental Property</label>
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
                  ? 'No tenants found for this property'
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

        {/* Tenant Forwarding Address */}
        <div>
          <label className="block text-sm font-medium mb-1">Tenant Forwarding Address</label>
          <Textarea
            value={formData.forwardingAddress}
            onChange={(e) => handleChange('forwardingAddress', e.target.value)}
            placeholder="456 New Street, Apt 2&#10;Houston, TX 77001"
            rows={2}
            required
          />
        </div>

        {/* Deposit Details */}
        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium mb-3">Deposit Details</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Move-Out Date</label>
              <Input
                type="date"
                value={formData.moveOutDate}
                onChange={(e) => handleChange('moveOutDate', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Original Security Deposit</label>
              <Input
                type="number"
                step="0.01"
                value={formData.depositAmount}
                onChange={(e) => handleChange('depositAmount', parseFloat(e.target.value) || 0)}
                placeholder="1200.00"
                required
              />
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium mb-3">Itemized Deductions</h3>
          <p className="text-sm text-gray-600 mb-4">
            Note: Normal wear and tear cannot be deducted per Texas law
          </p>

          {deductions.length > 0 && (
            <div className="space-y-2 mb-4">
              {deductions.map((deduction, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{deduction.description}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({DEDUCTION_CATEGORIES.find(c => c.value === deduction.category)?.label})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">${deduction.amount.toFixed(2)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDeduction(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-5">
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                type="text"
                value={newDeduction.description}
                onChange={(e) => setNewDeduction({ ...newDeduction, description: e.target.value })}
                placeholder="e.g., Carpet cleaning"
              />
            </div>
            <div className="col-span-3">
              <label className="block text-sm font-medium mb-1">Category</label>
              <Select
                value={newDeduction.category}
                onChange={(e) => setNewDeduction({ ...newDeduction, category: e.target.value })}
                options={DEDUCTION_CATEGORIES}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Amount</label>
              <Input
                type="number"
                step="0.01"
                value={newDeduction.amount || ''}
                onChange={(e) => setNewDeduction({ ...newDeduction, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="col-span-2">
              <Button type="button" variant="outline" onClick={addDeduction} className="w-full">
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="border-t pt-4 mt-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>Original Deposit:</span>
              <span className="font-medium">${formData.depositAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Total Deductions:</span>
              <span className="font-medium">-${totalDeductions.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Amount to Return:</span>
              <span className={refundAmount > 0 ? 'text-green-600' : ''}>${refundAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Generating Document...' : 'Generate Deposit Return Letter'}
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          This document is generated based on Texas Property Code § 92.103.
          Landlords have 30 days from move-out to return the deposit or provide an itemized statement.
          Failure to comply may result in liability for 3x the deposit plus $100.
          Always consult with a licensed attorney for legal advice specific to your situation.
        </p>
      </form>
    </Card>
  );
}
