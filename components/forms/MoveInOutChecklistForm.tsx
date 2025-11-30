'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { MoveInOutChecklistData, RoomCondition, ConditionRating } from '@/lib/prompts/move-in-out';
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

interface MoveInOutChecklistFormProps {
  onGenerate: (data: MoveInOutChecklistData) => void;
  loading: boolean;
}

const CHECKLIST_TYPES = [
  { value: 'move_in', label: 'Move-In Inspection' },
  { value: 'move_out', label: 'Move-Out Inspection' },
];

const OVERALL_CONDITIONS = [
  { value: 'excellent', label: 'Excellent - Like new' },
  { value: 'good', label: 'Good - Well maintained' },
  { value: 'fair', label: 'Fair - Normal wear' },
  { value: 'poor', label: 'Poor - Needs attention' },
];

const CONDITION_RATINGS = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'n/a', label: 'N/A' },
];

const DEFAULT_ROOMS = [
  'Living Room',
  'Kitchen',
  'Master Bedroom',
  'Bathroom',
  'Bedroom 2',
  'Dining Area',
];

export function MoveInOutChecklistForm({ onGenerate, loading }: MoveInOutChecklistFormProps) {
  const supabase = createClient();
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const [formData, setFormData] = useState<MoveInOutChecklistData>({
    landlordName: '',
    tenantName: '',
    propertyAddress: '',
    city: '',
    state: 'TX',
    zip: '',
    unitNumber: '',
    checklistType: 'move_in',
    inspectionDate: new Date().toISOString().split('T')[0],
    rooms: DEFAULT_ROOMS.map(room => ({
      room,
      walls: 'good' as ConditionRating,
      floors: 'good' as ConditionRating,
      windows: 'good' as ConditionRating,
      fixtures: 'good' as ConditionRating,
      notes: '',
    })),
    overallCondition: 'good',
    meterReadings: {
      electric: '',
      gas: '',
      water: '',
    },
    keysProvided: [],
    additionalNotes: '',
  });

  const [newKey, setNewKey] = useState('');
  const [newRoom, setNewRoom] = useState('');

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
        .select('id, address_line1, address_line2, city, state, zip')
        .eq('user_id', user.id)
        .order('address_line1'),
      supabase
        .from('tenants')
        .select('id, first_name, last_name, property_id')
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

  const handleChange = (field: keyof MoveInOutChecklistData, value: string | RoomCondition[] | { electric?: string; gas?: string; water?: string } | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRoomChange = (index: number, field: keyof RoomCondition, value: string) => {
    const updatedRooms = [...formData.rooms];
    updatedRooms[index] = { ...updatedRooms[index], [field]: value };
    handleChange('rooms', updatedRooms);
  };

  const handleMeterChange = (field: 'electric' | 'gas' | 'water', value: string) => {
    handleChange('meterReadings', { ...formData.meterReadings, [field]: value });
  };

  const addKey = () => {
    if (newKey.trim()) {
      handleChange('keysProvided', [...(formData.keysProvided || []), newKey.trim()]);
      setNewKey('');
    }
  };

  const removeKey = (index: number) => {
    const updatedKeys = [...(formData.keysProvided || [])];
    updatedKeys.splice(index, 1);
    handleChange('keysProvided', updatedKeys);
  };

  const addRoom = () => {
    if (newRoom.trim()) {
      const newRoomCondition: RoomCondition = {
        room: newRoom.trim(),
        walls: 'good',
        floors: 'good',
        windows: 'good',
        fixtures: 'good',
        notes: '',
      };
      handleChange('rooms', [...formData.rooms, newRoomCondition]);
      setNewRoom('');
    }
  };

  const removeRoom = (index: number) => {
    const updatedRooms = [...formData.rooms];
    updatedRooms.splice(index, 1);
    handleChange('rooms', updatedRooms);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onGenerate({
      ...formData,
      propertyId: selectedPropertyId || undefined,
      tenantId: selectedTenantId || undefined,
    } as MoveInOutChecklistData & { propertyId?: string; tenantId?: string });
  };

  return (
    <Card className="p-6 min-h-[600px]">
      <h2 className="text-2xl font-bold mb-6">Move-In/Move-Out Checklist</h2>
      <p className="text-gray-600 mb-6">
        Texas Property Code § 92.104 - Document property condition at move-in or move-out
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Inspection Type */}
        <div>
          <label className="block text-sm font-medium mb-1">Inspection Type</label>
          <Select
            value={formData.checklistType}
            onChange={(e) => handleChange('checklistType', e.target.value as 'move_in' | 'move_out')}
            options={CHECKLIST_TYPES}
            required
          />
        </div>

        {/* Landlord Name */}
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

        {selectedPropertyId && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-muted-foreground">Selected Property</p>
            <p className="font-medium">{formData.propertyAddress}</p>
            <p className="text-sm text-muted-foreground">{formData.city}, {formData.state} {formData.zip}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Unit # (optional)</label>
          <Input
            type="text"
            value={formData.unitNumber || ''}
            onChange={(e) => handleChange('unitNumber', e.target.value)}
            placeholder="101"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Inspection Date</label>
            <Input
              type="date"
              value={formData.inspectionDate}
              onChange={(e) => handleChange('inspectionDate', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Overall Condition</label>
            <Select
              value={formData.overallCondition}
              onChange={(e) => handleChange('overallCondition', e.target.value as MoveInOutChecklistData['overallCondition'])}
              options={OVERALL_CONDITIONS}
              required
            />
          </div>
        </div>

        {/* Room-by-Room Inspection */}
        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium mb-3">Room-by-Room Condition</h3>

          <div className="space-y-4">
            {formData.rooms.map((room, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">{room.room}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRoom(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Walls</label>
                    <Select
                      value={room.walls}
                      onChange={(e) => handleRoomChange(index, 'walls', e.target.value)}
                      options={CONDITION_RATINGS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Floors</label>
                    <Select
                      value={room.floors}
                      onChange={(e) => handleRoomChange(index, 'floors', e.target.value)}
                      options={CONDITION_RATINGS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Windows</label>
                    <Select
                      value={room.windows}
                      onChange={(e) => handleRoomChange(index, 'windows', e.target.value)}
                      options={CONDITION_RATINGS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Fixtures</label>
                    <Select
                      value={room.fixtures}
                      onChange={(e) => handleRoomChange(index, 'fixtures', e.target.value)}
                      options={CONDITION_RATINGS}
                    />
                  </div>
                </div>

                <div className="mt-2">
                  <Input
                    type="text"
                    value={room.notes || ''}
                    onChange={(e) => handleRoomChange(index, 'notes', e.target.value)}
                    placeholder="Notes for this room..."
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4 items-center">
            <Input
              type="text"
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
              placeholder="Add another room..."
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={addRoom}>
              Add
            </Button>
          </div>
        </div>

        {/* Meter Readings */}
        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium mb-3">Utility Meter Readings (optional)</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Electric</label>
              <Input
                type="text"
                value={formData.meterReadings?.electric || ''}
                onChange={(e) => handleMeterChange('electric', e.target.value)}
                placeholder="12345"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gas</label>
              <Input
                type="text"
                value={formData.meterReadings?.gas || ''}
                onChange={(e) => handleMeterChange('gas', e.target.value)}
                placeholder="67890"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Water</label>
              <Input
                type="text"
                value={formData.meterReadings?.water || ''}
                onChange={(e) => handleMeterChange('water', e.target.value)}
                placeholder="11223"
              />
            </div>
          </div>
        </div>

        {/* Keys */}
        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium mb-3">
            Keys {formData.checklistType === 'move_in' ? 'Provided' : 'Returned'}
          </h3>

          <div className="flex flex-wrap gap-2 mb-3">
            {(formData.keysProvided || []).map((key, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {key}
                <button
                  type="button"
                  onClick={() => removeKey(index)}
                  className="hover:text-blue-600"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2 items-center">
            <Input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="e.g., Front door, Mailbox, Garage..."
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKey())}
            />
            <Button type="button" variant="outline" onClick={addKey}>
              Add
            </Button>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="border-t pt-4 mt-4">
          <label className="block text-sm font-medium mb-1">Additional Notes (optional)</label>
          <Textarea
            value={formData.additionalNotes || ''}
            onChange={(e) => handleChange('additionalNotes', e.target.value)}
            placeholder="Any additional notes about the property condition..."
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Generating Document...' : 'Generate Checklist'}
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          This checklist is generated based on Texas Property Code § 92.104.
          Always consult with a licensed attorney for legal advice specific to your situation.
        </p>
      </form>
    </Card>
  );
}
