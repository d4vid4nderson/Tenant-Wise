'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SignatureModal } from '@/components/SignatureModal';
import {
  FiCalendar,
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
  lease_end: string | null;
  property_id: string | null;
  email: string | null;
  rent_amount?: number | null;
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

interface ExpiringLeasesCardProps {
  expiringLeases: Tenant[];
  propertyLookup: Record<string, string>;
  properties: Property[];
  landlordName: string;
  renewalDocsByTenant: Record<string, DocStatus>;
  today: Date;
}

export function ExpiringLeasesCard({
  expiringLeases,
  propertyLookup,
  properties,
  landlordName,
  renewalDocsByTenant: initialDocsByTenant,
  today,
}: ExpiringLeasesCardProps) {
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

    // Get property details
    const property = properties.find(p => p.id === tenant.property_id);
    const propertyAddress = property
      ? `${property.address_line1}${property.address_line2 ? `, ${property.address_line2}` : ''}`
      : '';

    // Calculate dates
    const currentLeaseEnd = tenant.lease_end || today.toISOString().split('T')[0];
    const leaseEndDate = new Date(currentLeaseEnd);
    const newLeaseStart = new Date(leaseEndDate);
    newLeaseStart.setDate(newLeaseStart.getDate() + 1); // Day after current lease ends
    const newLeaseEnd = new Date(newLeaseStart);
    newLeaseEnd.setFullYear(newLeaseEnd.getFullYear() + 1); // 1 year lease

    const responseDeadline = new Date(today);
    responseDeadline.setDate(responseDeadline.getDate() + 14); // 2 weeks to respond

    const currentRent = tenant.rent_amount || 0;
    const newRent = currentRent; // Same rent for now - could add increase logic

    // Set loading state for this tenant
    setGeneratingForTenant(prev => ({ ...prev, [tenant.id]: true }));

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'lease_renewal',
          formData: {
            tenantId: tenant.id,
            propertyId: tenant.property_id,
            landlordName: landlordName || 'Property Owner',
            tenantName,
            propertyAddress,
            city: property?.city || '',
            state: property?.state || 'TX',
            zip: property?.zip || '',
            currentLeaseEnd: currentLeaseEnd,
            newLeaseStart: newLeaseStart.toISOString().split('T')[0],
            newLeaseEnd: newLeaseEnd.toISOString().split('T')[0],
            currentRent,
            newRent,
            responseDeadline: responseDeadline.toISOString().split('T')[0],
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
            title: data.document.title || `Lease Renewal - ${tenantName}`,
          },
        }));
      } else {
        console.error('Failed to generate document:', data.error);
      }
    } catch (error) {
      console.error('Error generating document:', error);
    } finally {
      setGeneratingForTenant(prev => ({ ...prev, [tenant.id]: false }));
    }
  };

  // Filter out tenants that have already been sent (either from server data or locally sent)
  const visibleLeases = expiringLeases.filter(tenant => {
    const docStatus = docsByTenant[tenant.id];
    const isSent = docStatus?.sent;
    const sigStatus = docStatus?.status;
    // Hide if sent via server, completed, or locally marked as sent
    return !isSent && sigStatus !== 'completed' && !sentTenants.has(tenant.id);
  });

  if (visibleLeases.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        <p className="text-sm font-medium text-blue-600 flex items-center gap-2">
          <FiCalendar className="w-4 h-4" />
          Expiring Leases ({visibleLeases.length})
        </p>
        <div className="space-y-2">
          {visibleLeases.slice(0, 3).map(tenant => {
            const leaseEnd = new Date(tenant.lease_end!);
            const daysLeft = Math.ceil((leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const docStatus = docsByTenant[tenant.id];
            const hasDoc = !!docStatus;
            const isSent = docStatus?.sent;
            const sigStatus = docStatus?.status;
            const tenantName = `${tenant.first_name} ${tenant.last_name}`;
            const isGenerating = generatingForTenant[tenant.id];

            return (
              <div key={tenant.id} className={`p-2 rounded-lg ${
                sigStatus === 'completed' ? 'bg-green-50' :
                isSent ? 'bg-indigo-50' :
                hasDoc ? 'bg-amber-50' :
                isGenerating ? 'bg-orange-50' :
                'bg-blue-50'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-xs">{tenantName}</p>
                      {sigStatus === 'completed' ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium">
                          <FiCheckCircle className="w-2.5 h-2.5" />
                          Signed
                        </span>
                      ) : isSent ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-medium">
                          <FiSend className="w-2.5 h-2.5" />
                          Sent
                        </span>
                      ) : hasDoc ? (
                        <Link
                          href={`/dashboard/documents/${docStatus.id}`}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-medium hover:bg-amber-200 transition-colors"
                        >
                          <FiFileText className="w-2.5 h-2.5" />
                          Draft
                        </Link>
                      ) : isGenerating ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-medium">
                          <FiLoader className="w-2.5 h-2.5 animate-spin" />
                          Generating...
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tenant.property_id ? propertyLookup[tenant.property_id] : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold ${sigStatus === 'completed' ? 'text-green-600' : 'text-blue-600'}`}>
                    {daysLeft} days
                  </span>
                </div>
                {sigStatus === 'completed' ? (
                  <Link
                    href={`/dashboard/documents/${docStatus.id}`}
                    className="flex items-center justify-center gap-1.5 w-full mt-2 px-2 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                  >
                    <FiFileText className="w-3 h-3" />
                    View Renewal
                  </Link>
                ) : isSent ? (
                  <Link
                    href={`/dashboard/documents/${docStatus.id}`}
                    className="flex items-center justify-center gap-1.5 w-full mt-2 px-2 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors"
                  >
                    <FiClock className="w-3 h-3" />
                    Awaiting Signature
                  </Link>
                ) : hasDoc ? (
                  <button
                    onClick={() => openSignatureModal(
                      docStatus.id,
                      docStatus.title || `Lease Renewal - ${tenantName}`,
                      tenantName,
                      tenant.email || '',
                      tenant.id
                    )}
                    disabled={!tenant.email}
                    className="flex items-center justify-center gap-1.5 w-full mt-2 px-2 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-medium rounded hover:from-cyan-600 hover:to-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!tenant.email ? 'Tenant email required' : ''}
                  >
                    <FiSend className="w-3 h-3" />
                    Send Now
                  </button>
                ) : (
                  <button
                    onClick={() => handleGenerateDocument(tenant)}
                    disabled={isGenerating}
                    className="flex items-center justify-center gap-1.5 w-full mt-2 px-2 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <FiLoader className="w-3 h-3 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FiFileText className="w-3 h-3" />
                        Generate Renewal
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

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
