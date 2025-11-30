'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import ReactMarkdown from 'react-markdown';
import {
  FiArrowLeft,
  FiFileText,
  FiPrinter,
  FiDownload,
  FiEdit2,
  FiTrash2,
  FiCalendar,
  FiHome,
  FiUser,
  FiMapPin,
  FiCopy,
  FiCheck,
} from 'react-icons/fi';

interface Document {
  id: string;
  title: string;
  document_type: string;
  content: string;
  form_data: Record<string, unknown> | null;
  property_id: string | null;
  tenant_id: string | null;
  state: string;
  created_at: string;
}

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
  email: string | null;
  phone: string | null;
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

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [document, setDocument] = useState<Document | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [resolvedParams.id]);

  async function loadDocument() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Load document
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)
      .single();

    if (docError || !docData) {
      router.push('/dashboard/documents');
      return;
    }

    setDocument(docData);

    // Load related property if exists
    if (docData.property_id) {
      const { data: propData } = await supabase
        .from('properties')
        .select('*')
        .eq('id', docData.property_id)
        .single();
      setProperty(propData);
    }

    // Load related tenant if exists
    if (docData.tenant_id) {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', docData.tenant_id)
        .single();
      setTenant(tenantData);
    }

    setLoading(false);
  }

  const handlePrint = () => {
    window.print();
  };

  const handleCopyContent = async () => {
    if (!document) return;
    try {
      await navigator.clipboard.writeText(document.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDelete = async () => {
    if (!document) return;

    try {
      const response = await fetch(`/api/documents/${document.id}`, { method: 'DELETE' });
      if (response.ok) {
        router.push('/dashboard/documents');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleDownload = () => {
    if (!document) return;

    // Create a blob with the document content
    const blob = new Blob([document.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!document) return null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/documents"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to Documents
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <FiFileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{document.title}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${documentTypeColors[document.document_type] || documentTypeColors.other}`}>
                  {documentTypeLabels[document.document_type] || document.document_type}
                </span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <FiCalendar className="w-3 h-3" />
                  Created {new Date(document.created_at).toLocaleDateString()}
                </span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <FiMapPin className="w-3 h-3" />
                  {document.state}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyContent}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              title="Copy content"
            >
              {copied ? (
                <>
                  <FiCheck className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Copied!</span>
                </>
              ) : (
                <>
                  <FiCopy className="w-4 h-4" />
                  <span className="text-sm">Copy</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              title="Download"
            >
              <FiDownload className="w-4 h-4" />
              <span className="text-sm">Download</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors no-print"
              title="Print"
            >
              <FiPrinter className="w-4 h-4" />
              <span className="text-sm">Print</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors no-print"
              title="Delete"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Document Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-8">
              <div className="document-preview prose prose-sm max-w-none">
                <ReactMarkdown>{document.content}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 no-print">
          {/* Property Info */}
          {property && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FiHome className="w-4 h-4 text-blue-600" />
                  Property
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/dashboard/properties/${property.id}`}
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <p className="font-medium">{property.address_line1}</p>
                  {property.address_line2 && (
                    <p className="text-sm text-muted-foreground">{property.address_line2}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {property.city}, {property.state} {property.zip}
                  </p>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Tenant Info */}
          {tenant && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FiUser className="w-4 h-4 text-blue-600" />
                  Tenant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/dashboard/tenants/${tenant.id}`}
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <p className="font-medium">{tenant.first_name} {tenant.last_name}</p>
                  {tenant.email && (
                    <p className="text-sm text-muted-foreground">{tenant.email}</p>
                  )}
                  {tenant.phone && (
                    <p className="text-sm text-muted-foreground">{tenant.phone}</p>
                  )}
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Document Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FiFileText className="w-4 h-4 text-blue-600" />
                Document Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Type</p>
                <p className="font-medium">{documentTypeLabels[document.document_type] || document.document_type}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">State Law</p>
                <p className="font-medium">{document.state === 'TX' ? 'Texas' : document.state}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Created</p>
                <p className="font-medium">{new Date(document.created_at).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href={`/dashboard/documents/new?regenerate=${document.id}`}
                className="flex items-center gap-2 w-full px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <FiEdit2 className="w-4 h-4" />
                Regenerate Document
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 w-full px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
              >
                <FiTrash2 className="w-4 h-4" />
                Delete Document
              </button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Delete Document</h2>
            </div>
            <div className="p-6">
              <p className="text-muted-foreground mb-6">
                Are you sure you want to delete &quot;{document.title}&quot;? This action cannot be undone.
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
    </div>
  );
}
