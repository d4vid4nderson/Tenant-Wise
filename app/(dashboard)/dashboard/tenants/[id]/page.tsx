'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { Pet } from '@/types/database';
import {
  FiArrowLeft,
  FiEdit2,
  FiSave,
  FiX,
  FiTrash2,
  FiUser,
  FiMail,
  FiPhone,
  FiHome,
  FiCalendar,
  FiDollarSign,
  FiFileText,
  FiShield,
  FiHeart,
  FiPlus,
  FiBriefcase,
  FiAlertCircle,
  FiCheck,
  FiClock,
  FiImage,
  FiBold,
  FiItalic,
  FiList,
  FiMessageSquare,
} from 'react-icons/fi';
import { FaDog, FaCat, FaDove, FaFish, FaFrog } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';

// Helper function to get pet icon based on type
function getPetIcon(petType: string) {
  const type = petType.toLowerCase();
  switch (type) {
    case 'dog':
      return <FaDog className="w-5 h-5 text-amber-600" />;
    case 'cat':
      return <FaCat className="w-5 h-5 text-orange-500" />;
    case 'bird':
      return <FaDove className="w-5 h-5 text-sky-500" />;
    case 'fish':
      return <FaFish className="w-5 h-5 text-blue-500" />;
    case 'reptile':
      return <FaFrog className="w-5 h-5 text-green-600" />;
    default:
      return <FiHeart className="w-5 h-5 text-pink-500" />;
  }
}

// Helper function to get pet icon background color
function getPetIconBg(petType: string) {
  const type = petType.toLowerCase();
  switch (type) {
    case 'dog':
      return 'bg-amber-100';
    case 'cat':
      return 'bg-orange-100';
    case 'bird':
      return 'bg-sky-100';
    case 'fish':
      return 'bg-blue-100';
    case 'reptile':
      return 'bg-green-100';
    default:
      return 'bg-pink-100';
  }
}

interface Property {
  id: string;
  address_line1: string;
  city: string;
  state: string;
  zip: string;
  unit_count: number | null;
  monthly_rent: number | null;
}

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  property_id: string | null;
  unit_number: string | null;
  property?: Property;
  lease_start: string | null;
  lease_end: string | null;
  rent_amount: number | null;
  security_deposit: number | null;
  status: string;
  notes: string | null;
  // Screening fields
  date_of_birth: string | null;
  ssn_last_four: string | null;
  drivers_license: string | null;
  current_employer: string | null;
  employer_phone: string | null;
  annual_income: number | null;
  previous_address: string | null;
  previous_landlord_name: string | null;
  previous_landlord_phone: string | null;
  move_in_date: string | null;
  application_status: 'pending' | 'approved' | 'denied' | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  number_of_occupants: number | null;
  // Pet fields
  has_pets: boolean;
  pets: Pet[] | null;
  created_at: string;
  updated_at: string;
}

interface Document {
  id: string;
  title: string;
  document_type: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  past: 'bg-gray-100 text-gray-700',
};

const applicationStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  denied: 'bg-red-100 text-red-700',
};

const documentTypeLabels: Record<string, string> = {
  late_rent: 'Late Rent Notice',
  lease_renewal: 'Lease Renewal',
  maintenance: 'Maintenance Response',
  move_in_out: 'Move-In/Move-Out Checklist',
  deposit_return: 'Security Deposit Return',
  other: 'Other',
};

const petTypeOptions = ['Dog', 'Cat', 'Bird', 'Fish', 'Reptile', 'Other'];

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesContent, setNotesContent] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Edit form state
  const [formData, setFormData] = useState<Partial<Tenant>>({});
  const [pets, setPets] = useState<Pet[]>([]);
  const [propertyTenants, setPropertyTenants] = useState<{id: string; first_name: string; last_name: string; unit_number: string | null}[]>([]);

  useEffect(() => {
    loadData();
  }, [resolvedParams.id]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Load tenant with property
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('*, property:properties(*)')
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)
      .single();

    if (tenantError || !tenantData) {
      router.push('/dashboard/tenants');
      return;
    }

    setTenant(tenantData);
    setFormData(tenantData);
    setPets(tenantData.pets || []);

    // Load all properties for dropdown (including monthly_rent for auto-fill)
    const { data: propertiesData } = await supabase
      .from('properties')
      .select('id, address_line1, city, state, zip, unit_count, monthly_rent')
      .eq('user_id', user.id)
      .order('address_line1');

    setProperties(propertiesData || []);

    // Load documents issued to this tenant
    const { data: documentsData } = await supabase
      .from('documents')
      .select('id, title, document_type, created_at')
      .eq('tenant_id', resolvedParams.id)
      .order('created_at', { ascending: false });

    setDocuments(documentsData || []);
    setLoading(false);

    // Load tenants for the current property if assigned
    if (tenantData.property_id) {
      loadPropertyTenants(tenantData.property_id);
    }
  }

  // Fetch tenants for a specific property to show unit occupancy
  async function loadPropertyTenants(propertyId: string) {
    const { data: tenantsData } = await supabase
      .from('tenants')
      .select('id, first_name, last_name, unit_number')
      .eq('property_id', propertyId)
      .neq('id', resolvedParams.id); // Exclude current tenant

    setPropertyTenants(tenantsData || []);
  }

  const handleSave = async () => {
    if (!tenant) return;

    setSaving(true);
    try {
      // Auto-fill rent from property if rent_amount was cleared but property is assigned
      let dataToSave = { ...formData };
      if (dataToSave.property_id && !dataToSave.rent_amount) {
        const selectedProperty = properties.find(p => p.id === dataToSave.property_id);
        if (selectedProperty?.monthly_rent) {
          dataToSave.rent_amount = selectedProperty.monthly_rent;
          // Also auto-fill security deposit if empty
          if (!dataToSave.security_deposit) {
            dataToSave.security_deposit = selectedProperty.monthly_rent;
          }
        }
      }

      const response = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dataToSave,
          pets: pets.length > 0 ? pets : null,
          has_pets: pets.length > 0,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update tenant');
      }

      setTenant({ ...result.data, property: tenant.property });
      setFormData(result.data); // Update formData with the saved values (including auto-filled rent)
      setEditing(false);
      setMessage({ type: 'success', text: 'Tenant updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to update tenant' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tenant) return;

    try {
      const response = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete tenant');
      }

      router.push('/dashboard/tenants');
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to delete tenant' });
      setShowDeleteConfirm(false);
    }
  };

  const addPet = () => {
    setPets([...pets, { type: 'Dog', name: null, breed: null, weight: null }]);
  };

  const updatePet = (index: number, field: keyof Pet, value: string | number | null) => {
    const updated = [...pets];
    updated[index] = { ...updated[index], [field]: value };
    setPets(updated);
  };

  const removePet = (index: number) => {
    setPets(pets.filter((_, i) => i !== index));
  };

  const openNotesModal = () => {
    setNotesContent(tenant?.notes || '');
    setShowNotesModal(true);
  };

  const handleSaveNotes = async () => {
    if (!tenant) return;

    setSavingNotes(true);
    try {
      const response = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesContent }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save notes');
      }

      setTenant({ ...tenant, notes: notesContent });
      setShowNotesModal(false);
      setMessage({ type: 'success', text: 'Notes saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save notes' });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenant) {
      console.log('No file selected or no tenant');
      return;
    }

    console.log('Starting image upload:', file.name, file.type, file.size);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 5MB' });
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenant.id}/${Date.now()}.${fileExt}`;

      console.log('Uploading to tenant-notes bucket:', fileName);

      // Use the property-images bucket since it already exists
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('property-images')
        .upload(`tenant-notes/${fileName}`, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(`tenant-notes/${fileName}`);

      console.log('Public URL:', publicUrl);

      // Insert image markdown at cursor or at end
      const imageMarkdown = `\n![${file.name}](${publicUrl})\n`;
      setNotesContent(prev => prev + imageMarkdown);
      setMessage({ type: 'success', text: 'Image uploaded!' });
    } catch (error) {
      console.error('Full upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMessage({ type: 'error', text: `Failed to upload image: ${errorMessage}` });
    } finally {
      setUploadingImage(false);
      // Reset the input if it exists
      if (e.target && 'value' in e.target) {
        e.target.value = '';
      }
    }
  };

  const insertFormatting = (format: 'bold' | 'italic' | 'list') => {
    const textarea = document.getElementById('notes-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = notesContent;
    const selectedText = text.substring(start, end);

    let newText = '';
    let cursorOffset = 0;

    switch (format) {
      case 'bold':
        newText = text.substring(0, start) + `**${selectedText}**` + text.substring(end);
        cursorOffset = selectedText ? 0 : 2;
        break;
      case 'italic':
        newText = text.substring(0, start) + `*${selectedText}*` + text.substring(end);
        cursorOffset = selectedText ? 0 : 1;
        break;
      case 'list':
        newText = text.substring(0, start) + `\n- ${selectedText}` + text.substring(end);
        cursorOffset = 3;
        break;
    }

    setNotesContent(newText);

    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + cursorOffset + (selectedText ? selectedText.length + (format === 'list' ? 3 : format === 'bold' ? 4 : 2) : 0);
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const calculateLeaseDuration = () => {
    if (!tenant?.lease_start) return null;
    const start = new Date(tenant.lease_start);
    const end = tenant.lease_end ? new Date(tenant.lease_end) : new Date();
    const months = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}${remainingMonths > 0 ? `, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
    }
    return `${months} month${months !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 -mx-8 -mt-8 px-8 pt-8 pb-12 mb-8 rounded-b-3xl">
        <Link
          href="/dashboard/tenants"
          className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to Tenants
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-2xl">
                {tenant.first_name[0]}{tenant.last_name[0]}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {tenant.first_name} {tenant.last_name}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[tenant.status] || statusColors.past}`}>
                  {tenant.status}
                </span>
                {tenant.application_status && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${applicationStatusColors[tenant.application_status]}`}>
                    Application: {tenant.application_status}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={() => {
                    setEditing(false);
                    setFormData(tenant);
                    setPets(tenant.pets || []);
                  }}
                  className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30"
                >
                  <FiX className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                >
                  <FiSave className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    // When entering edit mode, auto-fill rent from property if not set
                    if (tenant.property_id && !tenant.rent_amount) {
                      const selectedProperty = properties.find(p => p.id === tenant.property_id);
                      if (selectedProperty?.monthly_rent) {
                        setFormData(prev => ({
                          ...prev,
                          rent_amount: selectedProperty.monthly_rent,
                          security_deposit: prev.security_deposit || selectedProperty.monthly_rent,
                        }));
                      }
                    }
                    setEditing(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30"
                >
                  <FiEdit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/80 text-white rounded-lg hover:bg-red-500"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiUser className="w-5 h-5 text-blue-600" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">First Name</label>
                      <input
                        type="text"
                        value={formData.first_name || ''}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Last Name</label>
                      <input
                        type="text"
                        value={formData.last_name || ''}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Date of Birth</label>
                      <input
                        type="date"
                        value={formData.date_of_birth || ''}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">SSN (Last 4)</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={formData.ssn_last_four || ''}
                        onChange={(e) => setFormData({ ...formData, ssn_last_four: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="1234"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Driver&apos;s License</label>
                    <input
                      type="text"
                      value={formData.drivers_license || ''}
                      onChange={(e) => setFormData({ ...formData, drivers_license: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <FiMail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{tenant.email || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <FiPhone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{tenant.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <FiCalendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date of Birth</p>
                      <p className="font-medium">
                        {tenant.date_of_birth
                          ? new Date(tenant.date_of_birth).toLocaleDateString()
                          : 'Not provided'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <FiShield className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-muted-foreground">SSN (Last 4)</p>
                      <p className="font-medium">{tenant.ssn_last_four ? `***-**-${tenant.ssn_last_four}` : 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Employment & Income */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiBriefcase className="w-5 h-5 text-blue-600" />
                Employment & Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Current Employer</label>
                      <input
                        type="text"
                        value={formData.current_employer || ''}
                        onChange={(e) => setFormData({ ...formData, current_employer: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Employer Phone</label>
                      <input
                        type="tel"
                        value={formData.employer_phone || ''}
                        onChange={(e) => setFormData({ ...formData, employer_phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Annual Income</label>
                    <input
                      type="number"
                      value={formData.annual_income || ''}
                      onChange={(e) => setFormData({ ...formData, annual_income: parseFloat(e.target.value) || null })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="50000"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Employer</p>
                    <p className="font-medium">{tenant.current_employer || 'Not provided'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Employer Phone</p>
                    <p className="font-medium">{tenant.employer_phone || 'Not provided'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                    <p className="text-sm text-muted-foreground">Annual Income</p>
                    <p className="font-medium text-lg text-green-600">
                      {tenant.annual_income ? `$${tenant.annual_income.toLocaleString()}` : 'Not provided'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rental History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiHome className="w-5 h-5 text-blue-600" />
                Previous Rental History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Previous Address</label>
                    <input
                      type="text"
                      value={formData.previous_address || ''}
                      onChange={(e) => setFormData({ ...formData, previous_address: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Previous Landlord Name</label>
                      <input
                        type="text"
                        value={formData.previous_landlord_name || ''}
                        onChange={(e) => setFormData({ ...formData, previous_landlord_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Previous Landlord Phone</label>
                      <input
                        type="tel"
                        value={formData.previous_landlord_phone || ''}
                        onChange={(e) => setFormData({ ...formData, previous_landlord_phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Previous Address</p>
                    <p className="font-medium">{tenant.previous_address || 'Not provided'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Landlord Name</p>
                      <p className="font-medium">{tenant.previous_landlord_name || 'Not provided'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Landlord Phone</p>
                      <p className="font-medium">{tenant.previous_landlord_phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pet Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiHeart className="w-5 h-5 text-blue-600" />
                Pet Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  {pets.map((pet, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Pet {index + 1}</span>
                        <button
                          onClick={() => removePet(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Type</label>
                          <select
                            value={pet.type}
                            onChange={(e) => updatePet(index, 'type', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {petTypeOptions.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Name</label>
                          <input
                            type="text"
                            value={pet.name || ''}
                            onChange={(e) => updatePet(index, 'name', e.target.value || null)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Breed</label>
                          <input
                            type="text"
                            value={pet.breed || ''}
                            onChange={(e) => updatePet(index, 'breed', e.target.value || null)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Weight (lbs)</label>
                          <input
                            type="number"
                            value={pet.weight || ''}
                            onChange={(e) => updatePet(index, 'weight', parseFloat(e.target.value) || null)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addPet}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600 w-full justify-center"
                  >
                    <FiPlus className="w-4 h-4" />
                    Add Pet
                  </button>
                </div>
              ) : (
                <div>
                  {tenant.pets && tenant.pets.length > 0 ? (
                    <div className="space-y-3">
                      {tenant.pets.map((pet, index) => (
                        <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                          <div className={`w-10 h-10 ${getPetIconBg(pet.type)} rounded-full flex items-center justify-center`}>
                            {getPetIcon(pet.type)}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{pet.name || 'Unnamed'} ({pet.type})</p>
                            <p className="text-sm text-muted-foreground">
                              {pet.breed && `${pet.breed}`}
                              {pet.breed && pet.weight && ' - '}
                              {pet.weight && `${pet.weight} lbs`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No pets on record</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents Issued */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FiFileText className="w-5 h-5 text-blue-600" />
                  Documents Issued
                </CardTitle>
                <Link
                  href={`/dashboard/documents/new?tenantId=${tenant.id}${tenant.property_id ? `&propertyId=${tenant.property_id}` : ''}`}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FiPlus className="w-4 h-4" />
                  Add Document
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <Link
                      key={doc.id}
                      href={`/dashboard/documents/${doc.id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FiFileText className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {documentTypeLabels[doc.document_type] || doc.document_type}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <FiFileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-muted-foreground mb-3">No documents issued yet</p>
                  <Link
                    href={`/dashboard/documents/new?tenantId=${tenant.id}${tenant.property_id ? `&propertyId=${tenant.property_id}` : ''}`}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FiPlus className="w-4 h-4" />
                    Create First Document
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FiMessageSquare className="w-5 h-5 text-blue-600" />
                  Notes
                </CardTitle>
                <button
                  onClick={openNotesModal}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FiEdit2 className="w-4 h-4" />
                  {tenant.notes ? 'Edit Notes' : 'Add Notes'}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {tenant.notes ? (
                <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-p:my-2 prose-ul:my-2 prose-li:my-0.5">
                  <ReactMarkdown>{tenant.notes}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-6">
                  <FiMessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-muted-foreground mb-3">No notes yet</p>
                  <button
                    onClick={openNotesModal}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FiPlus className="w-4 h-4" />
                    Add Notes
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Property Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiHome className="w-5 h-5 text-blue-600" />
                Property
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Property</label>
                    <select
                      value={formData.property_id || ''}
                      onChange={(e) => {
                        const newPropertyId = e.target.value || null;
                        const selectedProperty = properties.find(p => p.id === newPropertyId);

                        // Always update rent when property changes
                        // If new property has monthly_rent, use it; otherwise clear the fields
                        const rentAmount = selectedProperty?.monthly_rent ?? null;
                        const securityDeposit = selectedProperty?.monthly_rent ?? null;

                        setFormData({
                          ...formData,
                          property_id: newPropertyId,
                          unit_number: null,
                          rent_amount: rentAmount,
                          security_deposit: securityDeposit,
                        });
                        if (newPropertyId) {
                          loadPropertyTenants(newPropertyId);
                        } else {
                          setPropertyTenants([]);
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No property assigned</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.address_line1}, {p.city} {(p.unit_count || 1) > 1 ? `(${p.unit_count} units)` : ''}{p.monthly_rent ? ` - $${p.monthly_rent.toLocaleString()}/mo` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(() => {
                    const selectedProperty = properties.find(p => p.id === formData.property_id);
                    const unitCount = selectedProperty?.unit_count || 1;
                    if (unitCount > 1) {
                      return (
                        <div>
                          <label className="block text-sm font-medium mb-2">Unit Number</label>
                          <select
                            value={formData.unit_number || ''}
                            onChange={(e) => setFormData({ ...formData, unit_number: e.target.value || null })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select unit</option>
                            {Array.from({ length: unitCount }, (_, i) => i + 1).map((unit) => {
                              const occupyingTenant = propertyTenants.find(t => t.unit_number === String(unit));
                              return (
                                <option key={unit} value={String(unit)}>
                                  Unit {unit}{occupyingTenant ? ` - ${occupyingTenant.first_name} ${occupyingTenant.last_name}` : ' - Available'}
                                </option>
                              );
                            })}
                          </select>
                          <p className="text-xs text-muted-foreground mt-1">Select which unit this tenant occupies</p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              ) : tenant.property ? (
                <div className="space-y-3">
                  <Link
                    href={`/dashboard/properties/${tenant.property.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <p className="font-medium">
                      {tenant.property.address_line1}
                      {tenant.unit_number && <span className="text-blue-600">, Unit {tenant.unit_number}</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tenant.property.city}, {tenant.property.state} {tenant.property.zip}
                    </p>
                  </Link>
                  {tenant.unit_number && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium">Unit Number</p>
                      <p className="font-semibold text-blue-700">{tenant.unit_number}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No property assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Lease Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiCalendar className="w-5 h-5 text-blue-600" />
                Lease Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <select
                      value={formData.status || 'pending'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="past">Past</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Lease Start</label>
                    <input
                      type="date"
                      value={formData.lease_start || ''}
                      onChange={(e) => setFormData({ ...formData, lease_start: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Lease End</label>
                    <input
                      type="date"
                      value={formData.lease_end || ''}
                      onChange={(e) => setFormData({ ...formData, lease_end: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Move-In Date</label>
                    <input
                      type="date"
                      value={formData.move_in_date || ''}
                      onChange={(e) => setFormData({ ...formData, move_in_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Lease Period</p>
                    <p className="font-medium">
                      {tenant.lease_start
                        ? `${new Date(tenant.lease_start).toLocaleDateString()} - ${tenant.lease_end ? new Date(tenant.lease_end).toLocaleDateString() : 'Present'}`
                        : 'Not set'}
                    </p>
                  </div>
                  {calculateLeaseDuration() && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600">Duration</p>
                      <p className="font-medium text-blue-700">{calculateLeaseDuration()}</p>
                    </div>
                  )}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Move-In Date</p>
                    <p className="font-medium">
                      {tenant.move_in_date
                        ? new Date(tenant.move_in_date).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiDollarSign className="w-5 h-5 text-blue-600" />
                Financial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Monthly Rent</label>
                    <input
                      type="number"
                      value={formData.rent_amount || ''}
                      onChange={(e) => setFormData({ ...formData, rent_amount: parseFloat(e.target.value) || null })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Security Deposit</label>
                    <input
                      type="number"
                      value={formData.security_deposit || ''}
                      onChange={(e) => setFormData({ ...formData, security_deposit: parseFloat(e.target.value) || null })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">Monthly Rent</p>
                    <p className="font-semibold text-xl text-green-700">
                      {tenant.rent_amount
                        ? `$${tenant.rent_amount.toLocaleString()}`
                        : tenant.property?.monthly_rent
                          ? `$${tenant.property.monthly_rent.toLocaleString()}`
                          : 'Not set'}
                    </p>
                    {!tenant.rent_amount && tenant.property?.monthly_rent && (
                      <p className="text-xs text-green-500 mt-1">From property default</p>
                    )}
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Security Deposit</p>
                    <p className="font-medium">
                      {tenant.security_deposit
                        ? `$${tenant.security_deposit.toLocaleString()}`
                        : tenant.property?.monthly_rent
                          ? `$${tenant.property.monthly_rent.toLocaleString()}`
                          : 'Not set'}
                    </p>
                    {!tenant.security_deposit && tenant.property?.monthly_rent && (
                      <p className="text-xs text-gray-400 mt-1">From property default</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Application Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiShield className="w-5 h-5 text-blue-600" />
                Application
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Application Status</label>
                    <select
                      value={formData.application_status || ''}
                      onChange={(e) => setFormData({ ...formData, application_status: e.target.value as Tenant['application_status'] || null })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Not set</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="denied">Denied</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Number of Occupants</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.number_of_occupants || ''}
                      onChange={(e) => setFormData({ ...formData, number_of_occupants: parseInt(e.target.value) || null })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                    {tenant.application_status === 'approved' && <FiCheck className="w-5 h-5 text-green-600" />}
                    {tenant.application_status === 'pending' && <FiClock className="w-5 h-5 text-yellow-600" />}
                    {tenant.application_status === 'denied' && <FiAlertCircle className="w-5 h-5 text-red-600" />}
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-medium capitalize">{tenant.application_status || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Occupants</p>
                    <p className="font-medium">{tenant.number_of_occupants || 'Not specified'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiAlertCircle className="w-5 h-5 text-blue-600" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <input
                      type="text"
                      value={formData.emergency_contact_name || ''}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.emergency_contact_phone || ''}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{tenant.emergency_contact_name || 'Not provided'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{tenant.emergency_contact_phone || 'Not provided'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Delete Tenant</h2>
            </div>
            <div className="p-6">
              <p className="text-muted-foreground mb-6">
                Are you sure you want to delete {tenant.first_name} {tenant.last_name}? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-t-2xl">
              <h2 className="text-lg font-semibold flex items-center gap-3 text-white">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <FiMessageSquare className="w-5 h-5 text-white" />
                </div>
                Tenant Notes
              </h2>
              <button
                onClick={() => setShowNotesModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Formatting Toolbar */}
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
                <button
                  onClick={() => insertFormatting('bold')}
                  className="p-2.5 hover:bg-white rounded-md transition-colors"
                  title="Bold (Ctrl+B)"
                >
                  <FiBold className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertFormatting('italic')}
                  className="p-2.5 hover:bg-white rounded-md transition-colors"
                  title="Italic (Ctrl+I)"
                >
                  <FiItalic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertFormatting('list')}
                  className="p-2.5 hover:bg-white rounded-md transition-colors"
                  title="Bullet List"
                >
                  <FiList className="w-4 h-4" />
                </button>
              </div>

              {/* Text Area */}
              <textarea
                id="notes-textarea"
                value={notesContent}
                onChange={(e) => setNotesContent(e.target.value)}
                className="w-full h-48 p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm leading-relaxed"
                placeholder="Add notes about this tenant... You can include payment history, communication logs, maintenance requests, or any other relevant information."
              />

              {/* Image Upload Area */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-6 transition-colors ${
                  uploadingImage
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                  e.currentTarget.classList.remove('border-gray-300', 'bg-gray-50');
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!uploadingImage) {
                    e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                    e.currentTarget.classList.add('border-gray-300', 'bg-gray-50');
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                  e.currentTarget.classList.add('border-gray-300', 'bg-gray-50');
                  const files = e.dataTransfer.files;
                  if (files && files.length > 0) {
                    const fakeEvent = {
                      target: { files, value: '' },
                    } as unknown as React.ChangeEvent<HTMLInputElement>;
                    handleImageUpload(fakeEvent);
                  }
                }}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    uploadingImage ? 'bg-blue-100' : 'bg-gray-200'
                  }`}>
                    {uploadingImage ? (
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FiImage className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">
                      {uploadingImage ? 'Uploading image...' : 'Drag and drop images here'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {uploadingImage ? 'Please wait' : 'or click to browse (max 5MB)'}
                    </p>
                  </div>
                  {!uploadingImage && (
                    <label className="cursor-pointer">
                      <span className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors inline-block">
                        Choose File
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Preview Section (only show if there's content) */}
              {notesContent && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 border-b">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preview</span>
                  </div>
                  <div className="p-4 prose prose-sm max-w-none prose-headings:font-semibold prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-img:rounded-lg prose-img:max-h-48">
                    <ReactMarkdown>{notesContent}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowNotesModal(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                <FiSave className="w-4 h-4" />
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
