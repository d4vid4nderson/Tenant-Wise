'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { SignatureModal } from '@/components/SignatureModal';
import {
  FiAlertCircle,
  FiSend,
  FiClock,
  FiFileText,
  FiCheckCircle,
  FiLoader,
} from 'react-icons/fi';

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  rent_amount: number | null;
  property_id: string | null;
  unit_number: string | null;
  email: string | null;
}

interface Property {
  id: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
}

interface DocStatus {
  id: string;
  sent: boolean;
  status: string | null;
  title?: string;
}

interface UrgentItemsCardProps {
  lateRent: Tenant[];
  totalLateRent: number;
  propertyLookup: Record<string, string>;
  properties: Property[];
  landlordName: string;
  lateRentDocsByTenant: Record<string, DocStatus>;
  today: Date;
}

export function UrgentItemsCard({
  lateRent,
  totalLateRent,
  propertyLookup,
  properties,
  landlordName,
  lateRentDocsByTenant: initialDocsByTenant,
  today,
}: UrgentItemsCardProps) {
  const router = useRouter();

  // Local state to track documents (allows updating without full page refresh)
  const [docsByTenant, setDocsByTenant] = useState<Record<string, DocStatus>>(initialDocsByTenant);

  // Track which tenants have documents being generated
  const [generatingForTenant, setGeneratingForTenant] = useState<Record<string, boolean>>({});

  // Track which tenants have been sent (to remove from list)
  const [sentTenants, setSentTenants] = useState<Set<string>>(new Set());

  const [signatureModal, setSignatureModal] = useState<{
    isOpen: boolean;
    documentId: string;
    documentTitle: string;
    tenantName: string;
    tenantEmail: string;
    tenantId: string;
  }>({
    isOpen: false,
    documentId: '',
    documentTitle: '',
    tenantName: '',
    tenantEmail: '',
    tenantId: '',
  });

  const handleSignatureSuccess = () => {
    // Mark tenant as sent and remove from list
    if (signatureModal.tenantId) {
      setSentTenants(prev => new Set([...prev, signatureModal.tenantId]));
    }
  };

  const openSignatureModal = (
    docId: string,
    docTitle: string,
    tenantName: string,
    tenantEmail: string,
    tenantId: string
  ) => {
    setSignatureModal({
      isOpen: true,
      documentId: docId,
      documentTitle: docTitle,
      tenantName,
      tenantEmail,
      tenantId,
    });
  };

  const handleGenerateDocument = async (tenant: Tenant) => {
    const tenantName = `${tenant.first_name} ${tenant.last_name}`;
    const rentDueDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const noticeDate = today.toISOString().split('T')[0];

    // Get property details
    const property = properties.find(p => p.id === tenant.property_id);
    const propertyAddress = property
      ? `${property.address_line1}${property.address_line2 ? `, ${property.address_line2}` : ''}`
      : '';

    const rentAmount = tenant.rent_amount || 0;
    const lateFee = rentAmount * 0.05; // 5% late fee
    const totalOwed = rentAmount + lateFee;

    // Set loading state for this tenant
    setGeneratingForTenant(prev => ({ ...prev, [tenant.id]: true }));

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'late_rent',
          formData: {
            tenantId: tenant.id,
            propertyId: tenant.property_id,
            landlordName: landlordName || 'Property Owner',
            tenantName,
            propertyAddress,
            city: property?.city || '',
            state: property?.state || 'TX',
            zip: property?.zip || '',
            rentAmount,
            lateFee,
            totalOwed,
            rentDueDate,
            noticeDate,
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.document) {
        // Update local state with the new document
        setDocsByTenant(prev => ({
          ...prev,
          [tenant.id]: {
            id: data.document.id,
            sent: false,
            status: null,
            title: data.document.title || `Late Rent Notice - ${tenantName}`,
          },
        }));
      } else {
        console.error('Failed to generate document:', data.error);
        // Could add error toast here
      }
    } catch (error) {
      console.error('Error generating document:', error);
      // Could add error toast here
    } finally {
      setGeneratingForTenant(prev => ({ ...prev, [tenant.id]: false }));
    }
  };

  // Filter out tenants that have already been sent (either from server data or locally sent)
  const visibleTenants = lateRent.filter(tenant => {
    const docStatus = docsByTenant[tenant.id];
    const isSent = docStatus?.sent;
    const sigStatus = docStatus?.status;
    // Hide if: sent via server, has any signature status (pending/completed/etc), or locally marked as sent
    if (isSent || sigStatus || sentTenants.has(tenant.id)) {
      return false;
    }
    return true;
  });

  // Recalculate total for visible tenants
  const visibleTotalLateRent = visibleTenants.reduce((sum, t) => sum + (t.rent_amount || 0), 0);

  if (visibleTenants.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-red-600">
              <FiAlertCircle className="w-5 h-5" />
              Urgent: Late Rent Payments
            </CardTitle>
            <span className="text-lg font-bold text-red-600">
              ${visibleTotalLateRent.toLocaleString()} overdue
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {visibleTenants.map(tenant => {
              const docStatus = docsByTenant[tenant.id];
              const hasDoc = !!docStatus;
              const isSent = docStatus?.sent;
              const sigStatus = docStatus?.status;
              const tenantName = `${tenant.first_name} ${tenant.last_name}`;
              const isGenerating = generatingForTenant[tenant.id];

              return (
                <div key={tenant.id} className={`flex items-center justify-between p-3 rounded-lg ${
                  sigStatus === 'completed' ? 'bg-green-50' :
                  isSent ? 'bg-blue-50' :
                  hasDoc ? 'bg-amber-50' :
                  isGenerating ? 'bg-orange-50' :
                  'bg-red-50'
                }`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{tenantName}</p>
                      {/* Status Badge */}
                      {sigStatus === 'completed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <FiCheckCircle className="w-3 h-3" />
                          Signed
                        </span>
                      ) : isSent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          <FiSend className="w-3 h-3" />
                          Sent
                        </span>
                      ) : hasDoc ? (
                        <Link
                          href={`/dashboard/documents/${docStatus.id}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium hover:bg-amber-200 transition-colors"
                        >
                          <FiFileText className="w-3 h-3" />
                          Draft
                        </Link>
                      ) : isGenerating ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                          <FiLoader className="w-3 h-3 animate-spin" />
                          Generating...
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tenant.property_id ? propertyLookup[tenant.property_id] : 'No property'}
                      {tenant.unit_number ? ` (Unit ${tenant.unit_number})` : ''}
                    </p>
                  </div>
                  <div className="text-right mr-4">
                    <p className={`font-semibold ${sigStatus === 'completed' ? 'text-green-600' : 'text-red-600'}`}>
                      ${tenant.rent_amount?.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sigStatus === 'completed' ? 'notice signed' : 'overdue'}
                    </p>
                  </div>
                  {sigStatus === 'completed' ? (
                    <Link
                      href={`/dashboard/documents/${docStatus.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <FiFileText className="w-3.5 h-3.5" />
                      View Notice
                    </Link>
                  ) : isSent ? (
                    <Link
                      href={`/dashboard/documents/${docStatus.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <FiClock className="w-3.5 h-3.5" />
                      Awaiting
                    </Link>
                  ) : hasDoc ? (
                    <button
                      onClick={() => openSignatureModal(
                        docStatus.id,
                        docStatus.title || `Late Rent Notice - ${tenantName}`,
                        tenantName,
                        tenant.email || '',
                        tenant.id
                      )}
                      disabled={!tenant.email}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-medium rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!tenant.email ? 'Tenant email required' : ''}
                    >
                      <FiSend className="w-3.5 h-3.5" />
                      Send Now
                    </button>
                  ) : (
                    <button
                      onClick={() => handleGenerateDocument(tenant)}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? (
                        <>
                          <FiLoader className="w-3.5 h-3.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FiFileText className="w-3.5 h-3.5" />
                          Generate Notice
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <SignatureModal
        isOpen={signatureModal.isOpen}
        onClose={() => setSignatureModal(prev => ({ ...prev, isOpen: false }))}
        documentId={signatureModal.documentId}
        documentTitle={signatureModal.documentTitle}
        tenantName={signatureModal.tenantName}
        tenantEmail={signatureModal.tenantEmail}
        onSuccess={handleSignatureSuccess}
      />
    </>
  );
}
