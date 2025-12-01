'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FiArrowLeft,
  FiFileText,
  FiPrinter,
  FiDownload,
  FiRefreshCw,
  FiTrash2,
  FiCalendar,
  FiHome,
  FiUser,
  FiMapPin,
  FiCopy,
  FiCheck,
  FiSend,
  FiEdit3,
  FiClock,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
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
  signature_request_id: string | null;
  signature_status: string | null;
}

interface SignatureInfo {
  signerEmail: string;
  signerName: string;
  status: string;
  signedAt: string | null;
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
  const [regenerating, setRegenerating] = useState(false);

  // Signature state
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [sendingSignature, setSendingSignature] = useState(false);
  const [signatureMessage, setSignatureMessage] = useState('');
  const [signatures, setSignatures] = useState<SignatureInfo[]>([]);

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

  const handleRegenerate = async () => {
    if (!document) return;

    setRegenerating(true);
    try {
      const response = await fetch(`/api/documents/${document.id}/regenerate`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        // Update the document state with new content
        setDocument(prev => prev ? { ...prev, content: data.document.content } : null);
      } else {
        const error = await response.json();
        console.error('Regeneration failed:', error);
      }
    } catch (error) {
      console.error('Error regenerating document:', error);
    } finally {
      setRegenerating(false);
    }
  };

  // Load signature status
  const loadSignatureStatus = async () => {
    if (!document?.signature_request_id) return;

    try {
      const response = await fetch(`/api/documents/${document.id}/signature`);
      if (response.ok) {
        const data = await response.json();
        if (data.signatures) {
          setSignatures(data.signatures);
        }
        // Update local document status
        if (data.status && data.status !== document.signature_status) {
          setDocument(prev => prev ? { ...prev, signature_status: data.status } : null);
        }
      }
    } catch (error) {
      console.error('Error loading signature status:', error);
    }
  };

  // Send document for signature
  const handleSendForSignature = async () => {
    if (!document || !tenant?.email) return;

    setSendingSignature(true);
    try {
      const response = await fetch(`/api/documents/${document.id}/signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: signatureMessage }),
      });

      if (response.ok) {
        const data = await response.json();
        setDocument(prev => prev ? {
          ...prev,
          signature_request_id: data.signatureRequestId,
          signature_status: 'pending',
        } : null);
        setShowSignatureModal(false);
        setSignatureMessage('');
      } else {
        const error = await response.json();
        console.error('Error sending for signature:', error);
      }
    } catch (error) {
      console.error('Error sending for signature:', error);
    } finally {
      setSendingSignature(false);
    }
  };

  // Cancel signature request
  const handleCancelSignature = async () => {
    if (!document?.signature_request_id) return;

    try {
      const response = await fetch(`/api/documents/${document.id}/signature`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDocument(prev => prev ? {
          ...prev,
          signature_request_id: null,
          signature_status: 'cancelled',
        } : null);
        setSignatures([]);
      }
    } catch (error) {
      console.error('Error cancelling signature:', error);
    }
  };

  // Get signature status display info
  const getSignatureStatusInfo = (status: string | null) => {
    switch (status) {
      case 'pending':
        return { label: 'Awaiting Signatures', color: 'bg-yellow-100 text-yellow-700', icon: FiClock };
      case 'partially_signed':
        return { label: 'Partially Signed', color: 'bg-blue-100 text-blue-700', icon: FiEdit3 };
      case 'completed':
        return { label: 'Fully Signed', color: 'bg-green-100 text-green-700', icon: FiCheckCircle };
      case 'declined':
        return { label: 'Declined', color: 'bg-red-100 text-red-700', icon: FiX };
      case 'cancelled':
        return { label: 'Cancelled', color: 'bg-gray-100 text-gray-700', icon: FiX };
      case 'expired':
        return { label: 'Expired', color: 'bg-orange-100 text-orange-700', icon: FiAlertCircle };
      default:
        return { label: 'Not Sent', color: 'bg-gray-100 text-gray-600', icon: FiSend };
    }
  };

  // Load signature status when document has a signature request
  useEffect(() => {
    if (document?.signature_request_id) {
      loadSignatureStatus();
    }
  }, [document?.signature_request_id]);

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
            <CardContent className="p-8 relative">
              {regenerating && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Regenerating document...</p>
                  </div>
                </div>
              )}
              <div className="document-preview prose prose-sm max-w-none prose-table:border-collapse prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:p-2 prose-td:border prose-td:border-gray-300 prose-td:p-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{document.content}</ReactMarkdown>
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

          {/* E-Signature Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FiEdit3 className="w-4 h-4 text-blue-600" />
                E-Signature
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const statusInfo = getSignatureStatusInfo(document.signature_status);
                const StatusIcon = statusInfo.icon;
                return (
                  <div className="space-y-3">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${statusInfo.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">{statusInfo.label}</span>
                    </div>

                    {/* Signature progress */}
                    {signatures.length > 0 && (
                      <div className="space-y-2">
                        {signatures.map((sig, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                            <div>
                              <p className="font-medium">{sig.signerName}</p>
                              <p className="text-xs text-muted-foreground">{sig.signerEmail}</p>
                            </div>
                            <span className={`text-xs font-medium ${
                              sig.status === 'signed' ? 'text-green-600' : 'text-yellow-600'
                            }`}>
                              {sig.status === 'signed' ? 'Signed' : 'Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions based on status */}
                    {!document.signature_request_id ? (
                      <button
                        onClick={() => setShowSignatureModal(true)}
                        disabled={!tenant?.email}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FiSend className="w-4 h-4" />
                        Send for Signature
                      </button>
                    ) : document.signature_status === 'pending' || document.signature_status === 'partially_signed' ? (
                      <button
                        onClick={handleCancelSignature}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
                      >
                        <FiX className="w-4 h-4" />
                        Cancel Request
                      </button>
                    ) : null}

                    {!tenant?.email && !document.signature_request_id && (
                      <p className="text-xs text-muted-foreground text-center">
                        Tenant email required for e-signature
                      </p>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={handleRegenerate}
                disabled={regenerating || !document.form_data}
                className="flex items-center gap-2 w-full px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {regenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <FiRefreshCw className="w-4 h-4" />
                    Regenerate Document
                  </>
                )}
              </button>
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

      {/* Send for Signature Modal */}
      {showSignatureModal && tenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Send for E-Signature</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">This document will be sent to:</p>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{tenant.first_name} {tenant.last_name}</p>
                    <p className="text-sm text-muted-foreground">{tenant.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Personal Message (optional)
                  </label>
                  <textarea
                    value={signatureMessage}
                    onChange={(e) => setSignatureMessage(e.target.value)}
                    placeholder="Add a personal message to include with the signature request..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                </div>

                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Both you and the tenant will receive an email with a link to sign this document via SignWell.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowSignatureModal(false);
                    setSignatureMessage('');
                  }}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendForSignature}
                  disabled={sendingSignature}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50"
                >
                  {sendingSignature ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <FiSend className="w-4 h-4" />
                      Send for Signature
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
