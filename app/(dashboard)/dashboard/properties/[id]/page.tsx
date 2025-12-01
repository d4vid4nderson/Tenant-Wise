'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { FiHome, FiArrowLeft, FiMapPin, FiUsers, FiFileText, FiEdit2, FiTrash2, FiSave, FiX, FiCheck, FiAlertCircle, FiPlus, FiCalendar, FiDollarSign, FiUpload, FiImage, FiRefreshCw, FiStar, FiChevronLeft, FiChevronRight, FiAlignLeft, FiZap, FiUserPlus, FiUserMinus, FiTarget } from 'react-icons/fi';
import FocalPointSelector from '@/components/FocalPointSelector';
import RentComparisonChart from '@/components/RentComparisonChart';
import { RichTextEditor, RichTextDisplay } from '@/components/ui/RichTextEditor';

type PropertyStatus = 'available' | 'occupied' | 'under_construction';

interface Property {
  id: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
  unit_count: number;
  property_type: string | null;
  status: PropertyStatus | null;
  notes: string | null;
  description: string | null;
  monthly_rent: number | null;
  market_rent: number | null;
  image_url: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  rent_due_day: number | null;
  cover_focal_x: number | null;
  cover_focal_y: number | null;
  created_at: string;
  updated_at: string;
}

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  lease_start: string | null;
  lease_end: string | null;
  rent_amount: number | null;
  status: string;
  unit_number: string | null;
}

interface Document {
  id: string;
  title: string;
  document_type: string;
  created_at: string;
}

interface PropertyImage {
  id: string;
  property_id: string;
  image_url: string;
  caption: string | null;
  display_order: number;
  is_primary: boolean;
  focal_x: number | null;
  focal_y: number | null;
  created_at: string;
}

const propertyTypeLabels: Record<string, string> = {
  single_family: 'Single Family',
  duplex: 'Duplex',
  apartment: 'Apartment',
  condo: 'Condo',
  townhouse: 'Townhouse',
  other: 'Other',
};

const propertyStatusLabels: Record<PropertyStatus, string> = {
  available: 'Available',
  occupied: 'Occupied',
  under_construction: 'Under Construction',
};

const documentTypeLabels: Record<string, string> = {
  late_rent: 'Late Rent Notice',
  lease_renewal: 'Lease Renewal',
  maintenance: 'Maintenance',
  move_in_out: 'Move In/Out',
  deposit_return: 'Deposit Return',
  other: 'Other',
};

// Helper for ordinal suffixes (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [property, setProperty] = useState<Property | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    address_line1: '',
    address_line2: '',
    city: '',
    state: 'TX',
    zip: '',
    unit_count: 1,
    property_type: '',
    status: 'available' as PropertyStatus,
    notes: '',
    description: '',
    monthly_rent: '' as string | number,
    market_rent: '' as string | number,
    bedrooms: '' as string | number,
    bathrooms: '' as string | number,
    sqft: '' as string | number,
    rent_due_day: '' as string | number,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fetchingMarketRent, setFetchingMarketRent] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);

  // Gallery state
  const [propertyImages, setPropertyImages] = useState<PropertyImage[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [pendingUploads, setPendingUploads] = useState<{ file: File; preview: string; caption: string }[]>([]);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  // Focal point editing state
  const [editingFocalPoint, setEditingFocalPoint] = useState<{ type: 'cover' | 'gallery'; imageId?: string; imageUrl: string; focalX: number; focalY: number } | null>(null);
  const [savingFocalPoint, setSavingFocalPoint] = useState(false);

  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Status change modal state
  const [showRemoveTenantModal, setShowRemoveTenantModal] = useState(false);
  const [showAssignTenantModal, setShowAssignTenantModal] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [pendingStatusChange, setPendingStatusChange] = useState<PropertyStatus | null>(null);
  const [processingStatusChange, setProcessingStatusChange] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch property
    const { data: propertyData, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (propertyError || !propertyData) {
      router.push('/dashboard/properties');
      return;
    }

    setProperty(propertyData);
    setFormData({
      address_line1: propertyData.address_line1,
      address_line2: propertyData.address_line2 || '',
      city: propertyData.city,
      state: propertyData.state,
      zip: propertyData.zip,
      unit_count: propertyData.unit_count,
      property_type: propertyData.property_type || '',
      status: propertyData.status || 'available',
      notes: propertyData.notes || '',
      description: propertyData.description || '',
      monthly_rent: propertyData.monthly_rent || '',
      market_rent: propertyData.market_rent || '',
      bedrooms: propertyData.bedrooms || '',
      bathrooms: propertyData.bathrooms || '',
      sqft: propertyData.sqft || '',
      rent_due_day: propertyData.rent_due_day || '',
    });
    if (propertyData.image_url) {
      setImagePreview(propertyData.image_url);
    }

    // Fetch tenants for this property
    const { data: tenantsData } = await supabase
      .from('tenants')
      .select('*')
      .eq('property_id', id)
      .order('last_name', { ascending: true });

    setTenants(tenantsData || []);

    // Fetch documents for this property
    const { data: documentsData } = await supabase
      .from('documents')
      .select('id, title, document_type, created_at')
      .eq('property_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    setDocuments(documentsData || []);

    // Fetch property images from gallery
    await loadPropertyImages();

    setLoading(false);
  }

  async function loadPropertyImages() {
    try {
      const response = await fetch(`/api/properties/${id}/images`);
      if (response.ok) {
        const data = await response.json();
        setPropertyImages(data.images || []);
      }
    } catch (error) {
      console.error('Error loading property images:', error);
    }
  }

  // Fetch available tenants (not assigned to any property)
  async function fetchAvailableTenants() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: allTenants } = await supabase
        .from('tenants')
        .select('*')
        .eq('user_id', user.id)
        .is('property_id', null)
        .order('last_name', { ascending: true });

      setAvailableTenants(allTenants || []);
    } catch (error) {
      console.error('Error fetching available tenants:', error);
    }
  }

  // Handle status change from dropdown
  const handleStatusChange = async (newStatus: PropertyStatus) => {
    const currentStatus = formData.status;

    // If changing from occupied to available or under_construction, show remove tenant modal
    if (currentStatus === 'occupied' && (newStatus === 'available' || newStatus === 'under_construction')) {
      const activeTenants = tenants.filter(t => t.status === 'active');
      if (activeTenants.length > 0) {
        setPendingStatusChange(newStatus);
        setShowRemoveTenantModal(true);
        return;
      }
    }

    // If changing to occupied (from available or under_construction), show assign tenant modal
    if (currentStatus !== 'occupied' && newStatus === 'occupied') {
      await fetchAvailableTenants();
      setPendingStatusChange(newStatus);
      setSelectedTenantId('');
      setShowAssignTenantModal(true);
      return;
    }

    // For other changes, just update directly
    setFormData({ ...formData, status: newStatus });
  };

  // Remove tenants from this property (set property_id to null)
  const handleRemoveTenants = async () => {
    setProcessingStatusChange(true);
    try {
      const activeTenants = tenants.filter(t => t.status === 'active');

      // Update each tenant to remove property assignment
      for (const tenant of activeTenants) {
        await fetch(`/api/tenants/${tenant.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ property_id: null }),
        });
      }

      // Update the status
      if (pendingStatusChange) {
        setFormData({ ...formData, status: pendingStatusChange });
      }

      // Refresh tenants list
      const { data: tenantsData } = await supabase
        .from('tenants')
        .select('*')
        .eq('property_id', id)
        .order('last_name', { ascending: true });
      setTenants(tenantsData || []);

      showMessage('success', 'Tenants removed from property');
    } catch (error) {
      showMessage('error', 'Failed to remove tenants');
    } finally {
      setProcessingStatusChange(false);
      setShowRemoveTenantModal(false);
      setPendingStatusChange(null);
    }
  };

  // Assign selected tenant to this property
  const handleAssignTenant = async () => {
    if (!selectedTenantId) {
      showMessage('error', 'Please select a tenant');
      return;
    }

    // Handle "Add New Tenant" option
    if (selectedTenantId === 'new') {
      router.push(`/dashboard/tenants/new?property=${id}`);
      return;
    }

    setProcessingStatusChange(true);
    try {
      // Update tenant to assign to this property
      const response = await fetch(`/api/tenants/${selectedTenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: id }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign tenant');
      }

      // Update the status
      if (pendingStatusChange) {
        setFormData({ ...formData, status: pendingStatusChange });
      }

      // Refresh tenants list
      const { data: tenantsData } = await supabase
        .from('tenants')
        .select('*')
        .eq('property_id', id)
        .order('last_name', { ascending: true });
      setTenants(tenantsData || []);

      showMessage('success', 'Tenant assigned to property');
    } catch (error) {
      showMessage('error', 'Failed to assign tenant');
    } finally {
      setProcessingStatusChange(false);
      setShowAssignTenantModal(false);
      setPendingStatusChange(null);
      setSelectedTenantId('');
    }
  };

  // Cancel status change
  const cancelStatusChange = () => {
    setShowRemoveTenantModal(false);
    setShowAssignTenantModal(false);
    setPendingStatusChange(null);
    setSelectedTenantId('');
  };

  // Handle multiple image selection for gallery
  const handleGalleryImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newUploads: { file: File; preview: string; caption: string }[] = [];

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newUploads.push({
          file,
          preview: e.target?.result as string,
          caption: '',
        });
        if (newUploads.length === files.length) {
          setPendingUploads((prev) => [...prev, ...newUploads]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove a pending upload
  const removePendingUpload = (index: number) => {
    setPendingUploads((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload all pending images to the gallery
  const uploadGalleryImages = async () => {
    if (pendingUploads.length === 0) return;

    setUploadingImage(true);
    let successCount = 0;

    for (const upload of pendingUploads) {
      try {
        // Upload to storage
        const imageUrl = await uploadImage(upload.file);
        if (!imageUrl) continue;

        // Add to gallery via API
        const response = await fetch(`/api/properties/${id}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: imageUrl,
            caption: upload.caption || null,
          }),
        });

        if (response.ok) {
          successCount++;
        }
      } catch (error) {
        console.error('Error uploading gallery image:', error);
      }
    }

    setPendingUploads([]);
    setUploadingImage(false);
    await loadPropertyImages();

    if (successCount > 0) {
      showMessage('success', `${successCount} image(s) uploaded successfully!`);
    }
  };

  // Delete a gallery image
  const deleteGalleryImage = async (imageId: string) => {
    setDeletingImageId(imageId);
    try {
      const response = await fetch(`/api/properties/${id}/images?imageId=${imageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadPropertyImages();
        // Adjust gallery index if needed
        if (galleryIndex >= propertyImages.length - 1 && galleryIndex > 0) {
          setGalleryIndex(galleryIndex - 1);
        }
        showMessage('success', 'Image deleted');
      } else {
        showMessage('error', 'Failed to delete image');
      }
    } catch (error) {
      showMessage('error', 'Failed to delete image');
    } finally {
      setDeletingImageId(null);
    }
  };

  // Set image as primary
  const setImageAsPrimary = async (imageId: string) => {
    try {
      const response = await fetch(`/api/properties/${id}/images`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_id: imageId,
          is_primary: true,
        }),
      });

      if (response.ok) {
        await loadPropertyImages();
        showMessage('success', 'Primary image updated');
      }
    } catch (error) {
      showMessage('error', 'Failed to set primary image');
    }
  };

  // Save focal point
  const saveFocalPoint = async (focalX: number, focalY: number) => {
    if (!editingFocalPoint) return;

    setSavingFocalPoint(true);
    try {
      if (editingFocalPoint.type === 'cover') {
        // Update cover image focal point on the property
        const response = await fetch(`/api/properties/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cover_focal_x: focalX,
            cover_focal_y: focalY,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          setProperty(result.data);
          showMessage('success', 'Cover image focal point saved');
        } else {
          throw new Error('Failed to save focal point');
        }
      } else if (editingFocalPoint.type === 'gallery' && editingFocalPoint.imageId) {
        // Update gallery image focal point
        const response = await fetch(`/api/properties/${id}/images`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_id: editingFocalPoint.imageId,
            focal_x: focalX,
            focal_y: focalY,
          }),
        });

        if (response.ok) {
          await loadPropertyImages();
          showMessage('success', 'Image focal point saved');
        } else {
          throw new Error('Failed to save focal point');
        }
      }
      setEditingFocalPoint(null);
    } catch (error) {
      showMessage('error', 'Failed to save focal point');
    } finally {
      setSavingFocalPoint(false);
    }
  };

  // Gallery navigation
  const nextImage = () => {
    setGalleryIndex((prev) => (prev + 1) % propertyImages.length);
  };

  const prevImage = () => {
    setGalleryIndex((prev) => (prev - 1 + propertyImages.length) % propertyImages.length);
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

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

  // Fetch market rent from HUD API
  const fetchMarketRent = async () => {
    const zip = formData.zip || property?.zip;
    if (!zip) {
      showMessage('error', 'ZIP code is required to fetch market rent');
      return;
    }

    setFetchingMarketRent(true);
    try {
      const response = await fetch(`/api/market-rent?zip=${zip}&bedrooms=2`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch market rent');
      }

      setFormData(prev => ({ ...prev, market_rent: result.data.market_rent }));
      showMessage('success', `Est. market rent: $${result.data.market_rent.toLocaleString()}/mo (${result.data.area_name})`);
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Failed to fetch market rent');
    } finally {
      setFetchingMarketRent(false);
    }
  };

  // Generate property description with AI
  const generateDescription = async () => {
    setGeneratingDescription(true);
    try {
      // Collect image URLs for AI to analyze
      const galleryImageUrls = propertyImages.map(img => img.image_url);
      const coverImageUrl = imagePreview || property?.image_url;

      const response = await fetch('/api/properties/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address_line1: formData.address_line1 || property?.address_line1,
          address_line2: formData.address_line2 || property?.address_line2,
          city: formData.city || property?.city,
          state: formData.state || property?.state,
          zip: formData.zip || property?.zip,
          property_type: formData.property_type || property?.property_type,
          bedrooms: formData.bedrooms || property?.bedrooms,
          bathrooms: formData.bathrooms || property?.bathrooms,
          sqft: formData.sqft || property?.sqft,
          unit_count: formData.unit_count || property?.unit_count,
          monthly_rent: formData.monthly_rent || property?.monthly_rent,
          notes: formData.notes || property?.notes,
          cover_image_url: coverImageUrl,
          gallery_image_urls: galleryImageUrls,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate description');
      }

      setFormData(prev => ({ ...prev, description: result.description }));
      showMessage('success', 'Description generated successfully!');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Failed to generate description');
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      let imageUrl = property?.image_url || null;

      // Upload new image if one was selected
      if (imageFile) {
        setUploadingImage(true);
        imageUrl = await uploadImage(imageFile);
        setUploadingImage(false);
      }

      const updateData = {
        ...formData,
        monthly_rent: formData.monthly_rent ? parseFloat(formData.monthly_rent.toString()) : null,
        market_rent: formData.market_rent ? parseFloat(formData.market_rent.toString()) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms.toString()) : null,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms.toString()) : null,
        sqft: formData.sqft ? parseInt(formData.sqft.toString()) : null,
        rent_due_day: formData.rent_due_day ? parseInt(formData.rent_due_day.toString()) : null,
        image_url: imageUrl,
      };

      const response = await fetch(`/api/properties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update property');
      }

      setProperty(result.data);
      setImageFile(null);
      setEditing(false);
      showMessage('success', 'Property updated successfully!');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Failed to update property');
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`/api/properties/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete property');
      }

      router.push('/dashboard/properties');
    } catch (error) {
      showMessage('error', 'Failed to delete property');
    }
  };

  const cancelEdit = () => {
    if (property) {
      setFormData({
        address_line1: property.address_line1,
        address_line2: property.address_line2 || '',
        city: property.city,
        state: property.state,
        zip: property.zip,
        unit_count: property.unit_count,
        property_type: property.property_type || '',
        status: property.status || 'available',
        notes: property.notes || '',
        description: property.description || '',
        monthly_rent: property.monthly_rent || '',
        market_rent: property.market_rent || '',
        bedrooms: property.bedrooms || '',
        bathrooms: property.bathrooms || '',
        sqft: property.sqft || '',
        rent_due_day: property.rent_due_day || '',
      });
      setImagePreview(property.image_url);
      setImageFile(null);
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!property) {
    return null;
  }

  return (
    <div>
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 -mx-8 -mt-8 px-8 pt-8 pb-12 mb-8 rounded-b-3xl">
        <Link
          href="/dashboard/properties"
          className="inline-flex items-center gap-2 text-emerald-100 hover:text-white mb-4 transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to Properties
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-white">{property.address_line1}</h1>
            <p className="text-emerald-100 flex items-center gap-2">
              <FiMapPin className="w-4 h-4" />
              {property.city}, {property.state} {property.zip}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                >
                  <FiEdit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/80 text-white rounded-lg hover:bg-red-500 transition-colors"
                >
                  <FiTrash2 className="w-4 h-4" />
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                >
                  <FiX className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <FiSave className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
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

      <div className="grid lg:grid-cols-3 gap-6 -mt-6">
        {/* Property Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-50 rounded-lg">
                  <FiHome className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <CardTitle>Property Details</CardTitle>
                  <CardDescription>Address and property information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Street Address</label>
                    <input
                      type="text"
                      value={formData.address_line1}
                      onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Unit/Apt #</label>
                    <input
                      type="text"
                      value={formData.address_line2}
                      onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">State</label>
                      <select
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="TX">Texas</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">ZIP</label>
                      <input
                        type="text"
                        value={formData.zip}
                        onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
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
                      <label className="block text-sm font-medium mb-2">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => handleStatusChange(e.target.value as PropertyStatus)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="available">Available</option>
                        <option value="occupied">Occupied</option>
                        <option value="under_construction">Under Construction</option>
                      </select>
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
                  {/* Property Details - Beds, Baths, SqFt */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Bedrooms</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.bedrooms}
                        onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Bathrooms</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.bathrooms}
                        onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Square Feet</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.sqft}
                        onChange={(e) => setFormData({ ...formData, sqft: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="1500"
                      />
                    </div>
                  </div>
                  {/* Rent Fields */}
                  <div className="grid grid-cols-3 gap-4">
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
                    <div>
                      <label className="block text-sm font-medium mb-2">Market Rent</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.market_rent}
                            onChange={(e) => setFormData({ ...formData, market_rent: e.target.value })}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="1600.00"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={fetchMarketRent}
                          disabled={fetchingMarketRent}
                          className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-1 text-sm font-medium whitespace-nowrap"
                          title="Fetch HUD Fair Market Rent for this ZIP code"
                        >
                          <FiRefreshCw className={`w-4 h-4 ${fetchingMarketRent ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Rent Due Day</label>
                      <select
                        value={formData.rent_due_day}
                        onChange={(e) => setFormData({ ...formData, rent_due_day: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select day...</option>
                        {[...Array(31)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1}{getOrdinalSuffix(i + 1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Cover Image */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Cover Image</label>
                    <p className="text-xs text-muted-foreground mb-3">This is the main image shown on property cards and at the top of the detail page</p>

                    {imagePreview ? (
                      <div className="relative w-full h-48 rounded-lg overflow-hidden mb-3 group">
                        <img
                          src={imagePreview}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                          style={{ objectPosition: `${property?.cover_focal_x ?? 50}% ${property?.cover_focal_y ?? 50}%` }}
                        />
                        <div className="absolute top-2 right-2 flex gap-1">
                          {property?.image_url && !imageFile && (
                            <button
                              type="button"
                              onClick={() => setEditingFocalPoint({
                                type: 'cover',
                                imageUrl: property.image_url!,
                                focalX: property.cover_focal_x ?? 50,
                                focalY: property.cover_focal_y ?? 50,
                              })}
                              className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Set focal point"
                            >
                              <FiTarget className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview(null);
                              setImageFile(null);
                            }}
                            className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-blue-400 transition-colors mb-3">
                        <label className="cursor-pointer block">
                          <FiImage className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                          <span className="text-sm text-gray-500">Click to upload cover image</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Photo Gallery */}
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium mb-2">Photo Gallery</label>
                    <p className="text-xs text-muted-foreground mb-3">Add additional photos of the property (interior, exterior, amenities, etc.)</p>

                    {/* Existing Gallery Images */}
                    {propertyImages.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-2">Gallery images ({propertyImages.length})</p>
                        <div className="grid grid-cols-4 gap-3">
                          {propertyImages.map((img) => (
                            <div key={img.id} className="relative group">
                              <img
                                src={img.image_url}
                                alt="Property"
                                className="w-full h-20 object-cover rounded-lg"
                                style={{ objectPosition: `${img.focal_x ?? 50}% ${img.focal_y ?? 50}%` }}
                              />
                              {/* Actions overlay */}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingFocalPoint({
                                    type: 'gallery',
                                    imageId: img.id,
                                    imageUrl: img.image_url,
                                    focalX: img.focal_x ?? 50,
                                    focalY: img.focal_y ?? 50,
                                  })}
                                  className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                                  title="Set focal point"
                                >
                                  <FiTarget className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteGalleryImage(img.id)}
                                  disabled={deletingImageId === img.id}
                                  className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50"
                                  title="Delete image"
                                >
                                  <FiTrash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pending Uploads Preview */}
                    {pendingUploads.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-2">Ready to upload ({pendingUploads.length})</p>
                        <div className="grid grid-cols-4 gap-3">
                          {pendingUploads.map((upload, idx) => (
                            <div key={idx} className="relative">
                              <img
                                src={upload.preview}
                                alt={`Pending ${idx + 1}`}
                                className="w-full h-20 object-cover rounded-lg border-2 border-blue-300"
                              />
                              <button
                                type="button"
                                onClick={() => removePendingUpload(idx)}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                              >
                                <FiX className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={uploadGalleryImages}
                          disabled={uploadingImage}
                          className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {uploadingImage ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <FiUpload className="w-4 h-4" />
                              Upload {pendingUploads.length} Image{pendingUploads.length > 1 ? 's' : ''}
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Add New Gallery Images */}
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                      <label className="cursor-pointer block">
                        <FiPlus className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                        <span className="text-sm text-gray-500">Add gallery images</span>
                        <p className="text-xs text-gray-400 mt-1">Select multiple images at once</p>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleGalleryImageSelect}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Internal notes (not shown to tenants)"
                    />
                  </div>

                  {/* Property Description */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">Property Description</label>
                      <button
                        type="button"
                        onClick={generateDescription}
                        disabled={generatingDescription}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        title="Generate description using AI"
                      >
                        <FiZap className={`w-3.5 h-3.5 ${generatingDescription ? 'animate-pulse' : ''}`} />
                        {generatingDescription ? 'Generating...' : 'Generate with AI'}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Add a detailed description of the property. Supports rich text formatting.
                    </p>
                    <RichTextEditor
                      content={formData.description}
                      onChange={(content) => setFormData({ ...formData, description: content })}
                      placeholder="Describe the property features, amenities, neighborhood, etc..."
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cover Image */}
                  {property.image_url ? (
                    <div className="relative h-64 w-full rounded-lg overflow-hidden">
                      <img
                        src={property.image_url}
                        alt={property.address_line1}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: `${property.cover_focal_x ?? 50}% ${property.cover_focal_y ?? 50}%` }}
                      />
                      <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 text-white text-xs font-medium rounded-full">
                        Cover Image
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 w-full rounded-lg bg-gray-100 flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <FiImage className="w-12 h-12 mx-auto mb-2" />
                        <p className="text-sm">No cover image</p>
                      </div>
                    </div>
                  )}

                  {/* Address - At the top */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Address</p>
                    <p className="font-semibold text-lg">
                      {property.address_line1}
                      {property.address_line2 && `, ${property.address_line2}`}
                    </p>
                    <p className="text-muted-foreground">{property.city}, {property.state} {property.zip}</p>
                  </div>

                  {/* Space Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Units</p>
                      <p className="font-semibold">{property.unit_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Bedrooms</p>
                      <p className="font-semibold">{property.bedrooms ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Bathrooms</p>
                      <p className="font-semibold">{property.bathrooms ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Sq Ft</p>
                      <p className="font-semibold">{property.sqft?.toLocaleString() ?? '—'}</p>
                    </div>
                  </div>

                  {/* Rent & Type Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Type</p>
                      <p className="font-semibold">{propertyTypeLabels[property.property_type || ''] || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {(property.unit_count || 1) > 1 ? 'Rent/Unit' : 'Monthly Rent'}
                      </p>
                      <p className="font-semibold text-green-600 text-lg">
                        {property.monthly_rent ? `$${property.monthly_rent.toLocaleString()}` : '—'}
                      </p>
                      {(property.unit_count || 1) > 1 && property.monthly_rent && (
                        <p className="text-xs text-green-600">
                          Total: ${(property.monthly_rent * (property.unit_count || 1)).toLocaleString()}/mo
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {(property.unit_count || 1) > 1 ? 'Market/Unit' : 'Market Rent'}
                      </p>
                      <p className="font-semibold text-lg">{property.market_rent ? `$${property.market_rent.toLocaleString()}` : '—'}</p>
                      {(property.unit_count || 1) > 1 && property.market_rent && (
                        <p className="text-xs text-muted-foreground">
                          Total: ${(property.market_rent * (property.unit_count || 1)).toLocaleString()}/mo
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Rent Due</p>
                      <p className="font-semibold">{property.rent_due_day ? `${property.rent_due_day}${getOrdinalSuffix(property.rent_due_day)} of month` : '—'}</p>
                    </div>
                  </div>

                  {/* Notes */}
                  {property.notes && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                      <p className="font-medium">{property.notes}</p>
                    </div>
                  )}

                  {/* Description */}
                  {property.description && (
                    <div className="p-4 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <FiAlignLeft className="w-4 h-4 text-gray-500" />
                        <p className="text-sm font-medium">Property Description</p>
                      </div>
                      <RichTextDisplay content={property.description} />
                    </div>
                  )}

                  {/* Image Gallery */}
                  {propertyImages.length > 0 && (
                    <div className="rounded-lg border border-gray-200 overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                          <FiImage className="w-4 h-4 text-gray-500" />
                          Photo Gallery ({propertyImages.length} images)
                        </h3>
                      </div>
                      {/* Main Gallery Image */}
                      <div className="relative h-48 w-full bg-gray-100">
                        <img
                          src={propertyImages[galleryIndex]?.image_url}
                          alt={`Property image ${galleryIndex + 1}`}
                          className="w-full h-full object-cover"
                          style={{ objectPosition: `${propertyImages[galleryIndex]?.focal_x ?? 50}% ${propertyImages[galleryIndex]?.focal_y ?? 50}%` }}
                        />
                        {propertyImages[galleryIndex]?.caption && (
                          <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-black/60 text-white text-sm">
                            {propertyImages[galleryIndex].caption}
                          </div>
                        )}
                        {/* Image counter */}
                        <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 text-white text-xs font-medium rounded-full">
                          {galleryIndex + 1} / {propertyImages.length}
                        </div>
                        {/* Navigation arrows */}
                        {propertyImages.length > 1 && (
                          <>
                            <button
                              onClick={prevImage}
                              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
                            >
                              <FiChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                              onClick={nextImage}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
                            >
                              <FiChevronRight className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                      {/* Thumbnail strip */}
                      {propertyImages.length > 1 && (
                        <div className="flex gap-2 p-3 bg-gray-50 overflow-x-auto">
                          {propertyImages.map((img, idx) => (
                            <button
                              key={img.id}
                              onClick={() => setGalleryIndex(idx)}
                              className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                                idx === galleryIndex ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'
                              }`}
                            >
                              <img
                                src={img.image_url}
                                alt={`Thumbnail ${idx + 1}`}
                                className="w-full h-full object-cover"
                                style={{ objectPosition: `${img.focal_x ?? 50}% ${img.focal_y ?? 50}%` }}
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card className="border-2 border-blue-200">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {editing ? (
                    <select
                      value={formData.status}
                      onChange={(e) => handleStatusChange(e.target.value as PropertyStatus)}
                      className="px-3 py-1 text-xs font-semibold rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="available">Available</option>
                      <option value="occupied">Occupied</option>
                      <option value="under_construction">Under Construction</option>
                    </select>
                  ) : (
                    (() => {
                      const activeTenants = tenants.filter(t => t.status === 'active').length;
                      const unitCount = property.unit_count || 1;

                      // Automatically derive status: if there are active tenants, it's occupied
                      const derivedStatus = activeTenants > 0 ? 'occupied' : (property.status || 'available');

                      // Get status gradient and label
                      let gradientClass = 'from-green-500 to-emerald-500';
                      let statusLabel = propertyStatusLabels[derivedStatus] || 'Available';

                      if (derivedStatus === 'occupied') {
                        gradientClass = 'from-blue-500 to-indigo-500';
                      } else if (derivedStatus === 'under_construction') {
                        gradientClass = 'from-orange-500 to-amber-500';
                      } else if (derivedStatus === 'available') {
                        gradientClass = 'from-green-500 to-emerald-500';
                      }

                      // For multi-unit occupied properties, show occupancy count
                      if (derivedStatus === 'occupied' && unitCount > 1) {
                        statusLabel = `${activeTenants}/${unitCount} Units`;
                      }

                      return (
                        <span className={`px-3 py-1 text-xs font-semibold text-white rounded-full bg-gradient-to-r ${gradientClass}`}>
                          {statusLabel}
                        </span>
                      );
                    })()
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tenants</span>
                  <span className="font-semibold text-blue-600">{tenants.filter(t => t.status === 'active').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Units</span>
                  <span className="font-semibold">{property.unit_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Monthly Income</span>
                  <span className="font-semibold text-green-600">
                    ${tenants.filter(t => t.status === 'active').reduce((sum, t) => sum + (t.rent_amount || property.monthly_rent || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tenants */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FiUsers className="w-4 h-4 text-blue-600" />
                  Tenants
                </CardTitle>
                <Link
                  href={`/dashboard/tenants?property=${id}`}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <FiPlus className="w-3 h-3" />
                  Add
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {tenants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tenants yet
                </p>
              ) : (
                <div className="space-y-2">
                  {tenants.map((tenant) => (
                    <Link
                      key={tenant.id}
                      href={`/dashboard/tenants/${tenant.id}`}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {tenant.first_name} {tenant.last_name}
                          {tenant.unit_number && (
                            <span className="ml-1 text-xs text-blue-600 font-normal">(Unit {tenant.unit_number})</span>
                          )}
                        </p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          tenant.status === 'active' ? 'bg-green-100 text-green-700' :
                          tenant.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {tenant.status}
                        </span>
                      </div>
                      {tenant.rent_amount && (
                        <p className="text-sm font-medium text-green-600">${tenant.rent_amount.toLocaleString()}</p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rent Comparison Chart */}
          {property.monthly_rent && !editing && (
            <RentComparisonChart
              propertyId={property.id}
              currentRent={property.monthly_rent * (property.unit_count || 1)}
              currentMarketRent={property.market_rent ? property.market_rent * (property.unit_count || 1) : null}
              zipCode={property.zip}
              unitCount={property.unit_count || 1}
              onMarketRentUpdated={(marketRent) => {
                // marketRent comes back as per-unit from API, store as per-unit
                setProperty(prev => prev ? { ...prev, market_rent: marketRent } : prev);
              }}
            />
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href={`/dashboard/documents/new?property=${id}&type=late_rent`}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FiFileText className="w-4 h-4 text-cyan-600" />
                Late Rent Notice
              </Link>
              <Link
                href={`/dashboard/documents/new?property=${id}&type=lease_renewal`}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FiFileText className="w-4 h-4 text-blue-600" />
                Lease Renewal
              </Link>
              <Link
                href={`/dashboard/documents/new?property=${id}&type=maintenance`}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FiFileText className="w-4 h-4 text-indigo-600" />
                Maintenance Response
              </Link>
            </CardContent>
          </Card>

          {/* Recent Documents */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Recent Documents</CardTitle>
                <Link href={`/dashboard/documents?property=${id}`} className="text-xs text-blue-600 hover:text-blue-700">
                  View All
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No documents yet
                </p>
              ) : (
                <div className="space-y-2">
                  {documents.slice(0, 5).map((doc) => (
                    <Link
                      key={doc.id}
                      href={`/dashboard/documents/${doc.id}`}
                      className="block p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {documentTypeLabels[doc.document_type] || doc.document_type} • {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Remove Tenant Modal */}
      <Modal
        isOpen={showRemoveTenantModal}
        onClose={cancelStatusChange}
        title="Remove Tenants"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <FiUserMinus className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              Changing the status to &quot;Available&quot; will remove the following tenant(s) from this property:
            </p>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {tenants.filter(t => t.status === 'active').map(tenant => (
              <div
                key={tenant.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{tenant.first_name} {tenant.last_name}</p>
                  {tenant.email && <p className="text-sm text-gray-500">{tenant.email}</p>}
                </div>
                {tenant.rent_amount && (
                  <span className="text-sm font-medium text-green-600">${tenant.rent_amount.toLocaleString()}/mo</span>
                )}
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-500">
            The tenant records will be kept but unassigned from this property.
          </p>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={cancelStatusChange}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRemoveTenants}
              disabled={processingStatusChange}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {processingStatusChange ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Removing...
                </>
              ) : (
                <>
                  <FiUserMinus className="w-4 h-4" />
                  Remove Tenants
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Assign Tenant Modal */}
      <Modal
        isOpen={showAssignTenantModal}
        onClose={cancelStatusChange}
        title="Assign Tenant"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <FiUserPlus className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              Select a tenant to assign to this property, or add a new tenant.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Select Tenant</label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a tenant...</option>
              {availableTenants.map(tenant => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.first_name} {tenant.last_name}
                  {tenant.email ? ` (${tenant.email})` : ''}
                </option>
              ))}
              <option value="new" className="font-medium text-blue-600">
                + Add New Tenant
              </option>
            </select>
            {availableTenants.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                No unassigned tenants available. Select &quot;Add New Tenant&quot; to create one.
              </p>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={cancelStatusChange}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignTenant}
              disabled={!selectedTenantId || processingStatusChange}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {processingStatusChange ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Assigning...
                </>
              ) : selectedTenantId === 'new' ? (
                <>
                  <FiPlus className="w-4 h-4" />
                  Add New Tenant
                </>
              ) : (
                <>
                  <FiUserPlus className="w-4 h-4" />
                  Assign Tenant
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Property Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Property"
        message={
          tenants.length > 0
            ? `This property has ${tenants.length} tenant(s). Deleting it will unlink them from this property. Are you sure you want to continue?`
            : 'Are you sure you want to delete this property? This action cannot be undone.'
        }
        confirmText="Delete Property"
        variant="danger"
      />

      {/* Focal Point Selector Modal */}
      {editingFocalPoint && (
        <FocalPointSelector
          imageUrl={editingFocalPoint.imageUrl}
          initialX={editingFocalPoint.focalX}
          initialY={editingFocalPoint.focalY}
          onSave={saveFocalPoint}
          onCancel={() => setEditingFocalPoint(null)}
          saving={savingFocalPoint}
        />
      )}
    </div>
  );
}
