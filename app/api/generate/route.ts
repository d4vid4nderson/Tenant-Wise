import { NextRequest, NextResponse } from 'next/server';
import { generateDocument, DOCUMENT_SYSTEM_PROMPT } from '@/lib/claude';
import { generateLateRentNoticePrompt, LateRentNoticeData } from '@/lib/prompts/late-rent-notice';
import { generateLeaseRenewalPrompt, LeaseRenewalData } from '@/lib/prompts/lease-renewal';
import { generateSecurityDepositReturnPrompt, SecurityDepositReturnData } from '@/lib/prompts/deposit-return';
import { generateMaintenanceResponsePrompt, MaintenanceResponseData } from '@/lib/prompts/maintenance';
import { generateMoveInOutChecklistPrompt, MoveInOutChecklistData } from '@/lib/prompts/move-in-out';
import { generateLeaseAgreementPrompt, LeaseAgreementData } from '@/lib/prompts/lease-agreement';
import { createClient } from '@/lib/supabase/server';

export type DocumentType = 'late_rent' | 'lease_renewal' | 'deposit_return' | 'maintenance' | 'move_in_out' | 'lease_agreement';

interface GenerateRequest {
  documentType: DocumentType;
  formData: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: GenerateRequest = await request.json();
    const { documentType, formData } = body;

    // Generate the appropriate prompt based on document type
    let prompt: string;
    let title: string;

    switch (documentType) {
      case 'late_rent': {
        const data = formData as unknown as LateRentNoticeData;
        prompt = generateLateRentNoticePrompt(data);
        title = `Late Rent Notice - ${data.tenantName}`;
        break;
      }
      case 'lease_renewal': {
        const data = formData as unknown as LeaseRenewalData;
        prompt = generateLeaseRenewalPrompt(data);
        title = `Lease Renewal - ${data.tenantName}`;
        break;
      }
      case 'deposit_return': {
        const data = formData as unknown as SecurityDepositReturnData;
        prompt = generateSecurityDepositReturnPrompt(data);
        title = `Security Deposit Return - ${data.tenantName}`;
        break;
      }
      case 'maintenance': {
        const data = formData as unknown as MaintenanceResponseData;
        prompt = generateMaintenanceResponsePrompt(data);
        title = `Maintenance Response - ${data.tenantName}`;
        break;
      }
      case 'move_in_out': {
        const data = formData as unknown as MoveInOutChecklistData;
        prompt = generateMoveInOutChecklistPrompt(data);
        const typeLabel = data.checklistType === 'move_in' ? 'Move-In' : 'Move-Out';
        title = `${typeLabel} Checklist - ${data.tenantName}`;
        break;
      }
      case 'lease_agreement': {
        const data = formData as unknown as LeaseAgreementData;
        prompt = generateLeaseAgreementPrompt(data);
        title = `Lease Agreement - ${data.tenantName}`;
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    // Generate document using Claude
    const content = await generateDocument(DOCUMENT_SYSTEM_PROMPT, prompt);

    // Extract property_id and tenant_id from formData if present
    const propertyId = (formData as Record<string, unknown>).propertyId as string | undefined;
    const tenantId = (formData as Record<string, unknown>).tenantId as string | undefined;

    // Save document to database
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        document_type: documentType,
        title,
        content,
        form_data: formData,
        property_id: propertyId || null,
        tenant_id: tenantId || null,
        state: 'TX',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to save document' }, { status: 500 });
    }

    // Update user's document count for the month
    await supabase.rpc('increment_document_count', { user_id: user.id });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        content: document.content,
      },
    });
  } catch (error) {
    console.error('Error generating document:', error);
    return NextResponse.json(
      { error: 'Failed to generate document' },
      { status: 500 }
    );
  }
}
