'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/Card';
import { DocumentPreview } from '@/components/DocumentPreview';
import { LateRentNoticeForm } from '@/components/forms/LateRentNoticeForm';
import { LeaseRenewalForm } from '@/components/forms/LeaseRenewalForm';
import { DepositReturnForm } from '@/components/forms/DepositReturnForm';
import { MaintenanceResponseForm } from '@/components/forms/MaintenanceResponseForm';
import { MoveInOutChecklistForm } from '@/components/forms/MoveInOutChecklistForm';
import { LeaseAgreementForm } from '@/components/forms/LeaseAgreementForm';
import {
  FiArrowLeft,
  FiFileText,
  FiAlertTriangle,
  FiRefreshCw,
  FiDollarSign,
  FiTool,
  FiClipboard,
  FiCheck,
  FiEdit,
} from 'react-icons/fi';

type DocumentType = 'late_rent' | 'lease_renewal' | 'deposit_return' | 'maintenance' | 'move_in_out' | 'lease_agreement';

interface DocumentTypeOption {
  id: DocumentType;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const documentTypes: DocumentTypeOption[] = [
  {
    id: 'late_rent',
    name: 'Late Rent Notice',
    description: 'Texas-compliant 3-day notice to pay or vacate',
    icon: <FiAlertTriangle className="w-6 h-6" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  {
    id: 'lease_renewal',
    name: 'Lease Renewal',
    description: 'Professional renewal offer with updated terms',
    icon: <FiRefreshCw className="w-6 h-6" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'deposit_return',
    name: 'Security Deposit Return',
    description: 'Itemized deductions per Texas Property Code § 92.103',
    icon: <FiDollarSign className="w-6 h-6" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    id: 'maintenance',
    name: 'Maintenance Response',
    description: 'Acknowledge request and set expectations',
    icon: <FiTool className="w-6 h-6" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  {
    id: 'move_in_out',
    name: 'Move-In/Move-Out Checklist',
    description: 'Document property condition at move-in or move-out',
    icon: <FiClipboard className="w-6 h-6" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    id: 'lease_agreement',
    name: 'Lease Agreement',
    description: 'Comprehensive residential lease per Texas Property Code',
    icon: <FiEdit className="w-6 h-6" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
];

function NewDocumentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState<{
    id: string;
    title: string;
    content: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pre-selected tenant/property from query params (support both naming conventions)
  const tenantId = searchParams.get('tenantId') || searchParams.get('tenant');
  const propertyId = searchParams.get('propertyId') || searchParams.get('property');
  const typeParam = searchParams.get('type') as DocumentType | null;

  useEffect(() => {
    if (typeParam && documentTypes.some(t => t.id === typeParam)) {
      setSelectedType(typeParam);
    }
  }, [typeParam]);

  const handleGenerate = async (formData: Record<string, unknown>) => {
    if (!selectedType) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: selectedType,
          formData: {
            ...formData,
            // Attach tenant/property IDs if provided
            ...(tenantId && { tenantId }),
            ...(propertyId && { propertyId }),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate document');
      }

      if (data.success) {
        setGeneratedDocument(data.document);
      } else {
        throw new Error('Document generation failed');
      }
    } catch (err) {
      console.error('Error generating document:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = () => {
    if (generatedDocument?.id) {
      router.push(`/dashboard/documents/${generatedDocument.id}`);
    }
  };

  const handleNewDocument = () => {
    setGeneratedDocument(null);
    setSelectedType(null);
    setError(null);
  };

  const renderForm = () => {
    switch (selectedType) {
      case 'late_rent':
        return <LateRentNoticeForm onGenerate={handleGenerate} loading={loading} />;
      case 'lease_renewal':
        return <LeaseRenewalForm onGenerate={handleGenerate} loading={loading} />;
      case 'deposit_return':
        return <DepositReturnForm onGenerate={handleGenerate} loading={loading} />;
      case 'maintenance':
        return <MaintenanceResponseForm onGenerate={handleGenerate} loading={loading} />;
      case 'move_in_out':
        return <MoveInOutChecklistForm onGenerate={handleGenerate} loading={loading} />;
      case 'lease_agreement':
        return <LeaseAgreementForm onGenerate={handleGenerate} loading={loading} />;
      default:
        return null;
    }
  };

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

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <FiFileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Create New Document</h1>
            <p className="text-muted-foreground">Generate AI-powered legal documents for Texas landlords</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {/* Success Message */}
      {generatedDocument && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <FiCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">Document Generated Successfully!</p>
                <p className="text-sm text-green-700">Your document has been saved and is ready to use.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleNewDocument}
                className="px-4 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                Create Another
              </button>
              <button
                onClick={handleViewDocument}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                View Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Type Selection */}
      {!selectedType && !generatedDocument && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Select Document Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documentTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className="p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all text-left group"
              >
                <div className={`w-12 h-12 ${type.bgColor} rounded-xl flex items-center justify-center mb-4 ${type.color} group-hover:scale-110 transition-transform`}>
                  {type.icon}
                </div>
                <h3 className="font-semibold mb-1">{type.name}</h3>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form and Preview */}
      {selectedType && !generatedDocument && (
        <>
          <div className="mb-4">
            <button
              onClick={() => setSelectedType(null)}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              <FiArrowLeft className="w-3 h-3" />
              Choose different document type
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Form */}
            <div>
              {renderForm()}
            </div>

            {/* Preview */}
            <div className="lg:sticky lg:top-6">
              <DocumentPreview
                content={generatedDocument?.content || null}
                loading={loading}
                title={generatedDocument?.title}
              />
            </div>
          </div>
        </>
      )}

      {/* Generated Document Preview */}
      {generatedDocument && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Document Details</h3>
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Title</p>
                    <p className="font-medium">{generatedDocument.title}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Document ID</p>
                    <p className="font-mono text-sm">{generatedDocument.id}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">
                      {documentTypes.find(t => t.id === selectedType)?.name || selectedType}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <DocumentPreview
              content={generatedDocument.content}
              loading={false}
              title={generatedDocument.title}
            />
          </div>
        </div>
      )}

      {/* Legal Disclaimer */}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>Disclaimer:</strong> Documents generated by this tool are based on Texas Property Code
          and are intended for informational purposes. Always consult with a licensed attorney for
          legal advice specific to your situation.
        </p>
      </div>
    </div>
  );
}

export default function NewDocumentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    }>
      <NewDocumentContent />
    </Suspense>
  );
}
