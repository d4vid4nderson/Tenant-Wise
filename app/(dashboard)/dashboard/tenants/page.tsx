'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { FiUsers, FiPlus, FiSearch, FiHome, FiPhone, FiMail, FiCalendar, FiFilter, FiX } from 'react-icons/fi';

interface Property {
  id: string;
  address_line1: string;
  city: string;
  state: string;
}

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  property_id: string | null;
  property?: Property;
  lease_start: string | null;
  lease_end: string | null;
  rent_amount: number | null;
  status: string;
  application_status: 'pending' | 'approved' | 'denied' | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  past: 'bg-gray-100 text-gray-700',
};

export default function TenantsPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const prefilledPropertyId = searchParams.get('property');

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [propertyFilter, setPropertyFilter] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasOpenedModal, setHasOpenedModal] = useState(false);

  const [newTenant, setNewTenant] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    property_id: prefilledPropertyId || '',
    lease_start: '',
    lease_end: '',
    rent_amount: '',
    security_deposit: '',
    status: 'pending',
  });

  useEffect(() => {
    loadData();
  }, []);

  // Auto-open add modal when property param is provided
  useEffect(() => {
    if (prefilledPropertyId && !loading && !hasOpenedModal) {
      setNewTenant(prev => ({ ...prev, property_id: prefilledPropertyId }));
      setShowAddModal(true);
      setHasOpenedModal(true);
    }
  }, [prefilledPropertyId, loading, hasOpenedModal]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load tenants with property info
    const { data: tenantsData } = await supabase
      .from('tenants')
      .select('*, property:properties(id, address_line1, city, state)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setTenants(tenantsData || []);

    // Load properties for filter/add modal
    const { data: propertiesData } = await supabase
      .from('properties')
      .select('id, address_line1, city, state')
      .eq('user_id', user.id)
      .order('address_line1');

    setProperties(propertiesData || []);
    setLoading(false);
  }

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      !search ||
      `${tenant.first_name} ${tenant.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      tenant.email?.toLowerCase().includes(search.toLowerCase()) ||
      tenant.phone?.includes(search);

    const matchesStatus = !statusFilter || tenant.status === statusFilter;
    const matchesProperty = !propertyFilter || tenant.property_id === propertyFilter;

    return matchesSearch && matchesStatus && matchesProperty;
  });

  const handleAddTenant = async () => {
    if (!newTenant.first_name || !newTenant.last_name) {
      setMessage({ type: 'error', text: 'First and last name are required' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTenant,
          property_id: newTenant.property_id || null,
          rent_amount: newTenant.rent_amount ? parseFloat(newTenant.rent_amount) : null,
          security_deposit: newTenant.security_deposit ? parseFloat(newTenant.security_deposit) : null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add tenant');
      }

      setMessage({ type: 'success', text: 'Tenant added successfully!' });
      setShowAddModal(false);
      setNewTenant({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        property_id: '',
        lease_start: '',
        lease_end: '',
        rent_amount: '',
        security_deposit: '',
        status: 'pending',
      });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to add tenant' });
    } finally {
      setSaving(false);
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
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 -mx-8 -mt-8 px-8 pt-8 pb-12 mb-8 rounded-b-3xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Tenants</h1>
            <p className="text-blue-100">Manage your tenants and applications</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            <FiPlus className="w-4 h-4" />
            Add Tenant
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search tenants..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="past">Past</option>
            </select>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.address_line1}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-blue-600">{tenants.length}</p>
            <p className="text-sm text-muted-foreground">Total Tenants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-green-600">{tenants.filter(t => t.status === 'active').length}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-yellow-600">{tenants.filter(t => t.application_status === 'pending').length}</p>
            <p className="text-sm text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-green-600">
              ${tenants.filter(t => t.status === 'active').reduce((sum, t) => sum + (t.rent_amount || 0), 0).toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Monthly Income</p>
          </CardContent>
        </Card>
      </div>

      {/* Tenant List */}
      {filteredTenants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FiUsers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No tenants found</h3>
            <p className="text-muted-foreground mb-4">
              {tenants.length === 0 ? "You haven't added any tenants yet." : 'No tenants match your filters.'}
            </p>
            {tenants.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <FiPlus className="w-4 h-4" />
                Add Your First Tenant
              </button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTenants.map((tenant) => (
            <Link
              key={tenant.id}
              href={`/dashboard/tenants/${tenant.id}`}
              className="block"
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-lg">
                          {tenant.first_name[0]}{tenant.last_name[0]}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{tenant.first_name} {tenant.last_name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {tenant.property && (
                            <span className="flex items-center gap-1">
                              <FiHome className="w-3 h-3" />
                              {tenant.property.address_line1}
                            </span>
                          )}
                          {tenant.email && (
                            <span className="flex items-center gap-1">
                              <FiMail className="w-3 h-3" />
                              {tenant.email}
                            </span>
                          )}
                          {tenant.phone && (
                            <span className="flex items-center gap-1">
                              <FiPhone className="w-3 h-3" />
                              {tenant.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {tenant.rent_amount && (
                        <p className="font-semibold text-green-600">${tenant.rent_amount.toLocaleString()}/mo</p>
                      )}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[tenant.status] || statusColors.past}`}>
                        {tenant.status}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Add Tenant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-semibold text-white">Add New Tenant</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg transition-colors text-white/80 hover:text-white hover:bg-white/20">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">First Name *</label>
                  <input
                    type="text"
                    value={newTenant.first_name}
                    onChange={(e) => setNewTenant({ ...newTenant, first_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Last Name *</label>
                  <input
                    type="text"
                    value={newTenant.last_name}
                    onChange={(e) => setNewTenant({ ...newTenant, last_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={newTenant.email}
                    onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <input
                    type="tel"
                    value={newTenant.phone}
                    onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Property</label>
                <select
                  value={newTenant.property_id}
                  onChange={(e) => setNewTenant({ ...newTenant, property_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select property...</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.address_line1}, {p.city}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Lease Start</label>
                  <input
                    type="date"
                    value={newTenant.lease_start}
                    onChange={(e) => setNewTenant({ ...newTenant, lease_start: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Lease End</label>
                  <input
                    type="date"
                    value={newTenant.lease_end}
                    onChange={(e) => setNewTenant({ ...newTenant, lease_end: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Monthly Rent</label>
                  <input
                    type="number"
                    value={newTenant.rent_amount}
                    onChange={(e) => setNewTenant({ ...newTenant, rent_amount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Security Deposit</label>
                  <input
                    type="number"
                    value={newTenant.security_deposit}
                    onChange={(e) => setNewTenant({ ...newTenant, security_deposit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={newTenant.status}
                  onChange={(e) => setNewTenant({ ...newTenant, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending (Application)</option>
                  <option value="active">Active</option>
                  <option value="past">Past</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTenant}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
