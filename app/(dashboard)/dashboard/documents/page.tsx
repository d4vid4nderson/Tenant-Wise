'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  FiFileText,
  FiPlus,
  FiSearch,
  FiFilter,
  FiCalendar,
  FiHome,
  FiUser,
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiTrash2,
  FiDownload,
  FiClock,
  FiAlertTriangle,
  FiX,
} from 'react-icons/fi';

interface Document {
  id: string;
  title: string;
  document_type: string;
  content: string;
  property_id: string | null;
  tenant_id: string | null;
  state: string;
  created_at: string;
  property?: {
    address_line1: string;
    city: string;
  } | null;
  tenant?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface Property {
  id: string;
  address_line1: string;
  city: string;
}

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
}

const documentTypeLabels: Record<string, string> = {
  late_rent: 'Late Rent Notice',
  lease_renewal: 'Lease Renewal',
  maintenance: 'Maintenance Response',
  move_in_out: 'Move-In/Move-Out Checklist',
  deposit_return: 'Security Deposit Return',
  other: 'Other',
};

const documentTypeColors: Record<string, string> = {
  late_rent: 'bg-red-100 text-red-700',
  lease_renewal: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
  move_in_out: 'bg-green-100 text-green-700',
  deposit_return: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function DocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');
  const [selectedProperty, setSelectedProperty] = useState(searchParams.get('property') || '');
  const [selectedTenant, setSelectedTenant] = useState(searchParams.get('tenant') || '');
  const [showFilters, setShowFilters] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadData();
  }, [page, selectedType, selectedProperty, selectedTenant]);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Load properties and tenants for filters
    const [propertiesResult, tenantsResult] = await Promise.all([
      supabase.from('properties').select('id, address_line1, city').eq('user_id', user.id).order('address_line1'),
      supabase.from('tenants').select('id, first_name, last_name').eq('user_id', user.id).order('last_name'),
    ]);

    setProperties(propertiesResult.data || []);
    setTenants(tenantsResult.data || []);

    // Build documents query
    let query = supabase
      .from('documents')
      .select('*, property:properties(address_line1, city), tenant:tenants(first_name, last_name)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (selectedType) {
      query = query.eq('document_type', selectedType);
    }
    if (selectedProperty) {
      query = query.eq('property_id', selectedProperty);
    }
    if (selectedTenant) {
      query = query.eq('tenant_id', selectedTenant);
    }
    if (searchQuery) {
      query = query.ilike('title', `%${searchQuery}%`);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error loading documents:', error);
    } else {
      setDocuments(data || []);
      setTotalCount(count || 0);
    }

    setLoading(false);
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType('');
    setSelectedProperty('');
    setSelectedTenant('');
    setPage(1);
  };

  const openDeleteModal = (doc: Document) => {
    setDocumentToDelete(doc);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;
    setDeleting(true);

    try {
      const response = await fetch(`/api/documents/${documentToDelete.id}`, { method: 'DELETE' });
      if (response.ok) {
        loadData();
        setShowDeleteModal(false);
        setDocumentToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Stats
  const thisMonthDocs = documents.filter(d => {
    const docDate = new Date(d.created_at);
    const now = new Date();
    return docDate.getMonth() === now.getMonth() && docDate.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div>
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 -mx-8 -mt-8 px-8 pt-8 pb-12 mb-8 rounded-b-3xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Documents</h1>
            <p className="text-indigo-100">Manage your generated legal documents</p>
          </div>
          <Link
            href="/dashboard/documents/new"
            className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium shadow-lg"
          >
            <FiPlus className="w-4 h-4" />
            New Document
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 -mt-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiFileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-sm text-muted-foreground">Total Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FiClock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{thisMonthDocs}</p>
                <p className="text-sm text-muted-foreground">This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <FiFileText className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {documents.filter(d => d.document_type === 'late_rent').length}
                </p>
                <p className="text-sm text-muted-foreground">Late Rent Notices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FiFileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {documents.filter(d => d.document_type === 'deposit_return').length}
                </p>
                <p className="text-sm text-muted-foreground">Deposit Returns</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </form>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <FiFilter className="w-4 h-4" />
              Filters
              {(selectedType || selectedProperty || selectedTenant) && (
                <span className="w-2 h-2 bg-blue-600 rounded-full" />
              )}
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium mb-2">Document Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {Object.entries(documentTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Property</label>
                <select
                  value={selectedProperty}
                  onChange={(e) => { setSelectedProperty(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Properties</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.address_line1}, {p.city}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tenant</label>
                <select
                  value={selectedTenant}
                  onChange={(e) => { setSelectedTenant(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Tenants</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3">
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FiFileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No documents found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedType || selectedProperty || selectedTenant
                  ? 'Try adjusting your filters'
                  : 'Create your first document to get started'}
              </p>
              <Link
                href="/dashboard/documents/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <FiPlus className="w-4 h-4" />
                Create Document
              </Link>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b text-sm font-medium text-gray-600">
                <div className="col-span-4">Document</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Property</div>
                <div className="col-span-2">Tenant</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Document Rows */}
              <div className="divide-y">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* Document Info */}
                    <div className="md:col-span-4">
                      <Link
                        href={`/dashboard/documents/${doc.id}`}
                        className="font-medium text-blue-600 hover:underline block truncate"
                      >
                        {doc.title}
                      </Link>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <FiCalendar className="w-3 h-3" />
                        {new Date(doc.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Type */}
                    <div className="md:col-span-2">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${documentTypeColors[doc.document_type] || documentTypeColors.other}`}>
                        {documentTypeLabels[doc.document_type] || doc.document_type}
                      </span>
                    </div>

                    {/* Property */}
                    <div className="md:col-span-2">
                      {doc.property ? (
                        <div className="flex items-center gap-2 text-sm">
                          <FiHome className="w-3 h-3 text-gray-400" />
                          <span className="truncate">{doc.property.address_line1}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>

                    {/* Tenant */}
                    <div className="md:col-span-2">
                      {doc.tenant ? (
                        <div className="flex items-center gap-2 text-sm">
                          <FiUser className="w-3 h-3 text-gray-400" />
                          <span className="truncate">{doc.tenant.first_name} {doc.tenant.last_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="md:col-span-2 flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/documents/${doc.id}`}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View"
                      >
                        <FiEye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => openDeleteModal(doc)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} documents
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && documentToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Delete Document</h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDocumentToDelete(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiAlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-center font-medium mb-2">Are you sure?</h3>
              <p className="text-center text-muted-foreground mb-6">
                This will permanently delete <span className="font-medium text-foreground">&quot;{documentToDelete.title}&quot;</span>. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDocumentToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
