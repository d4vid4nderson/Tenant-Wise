import { NextRequest, NextResponse } from 'next/server';
import { generateDocument, DOCUMENT_SYSTEM_PROMPT } from '@/lib/claude';
import { generateLateRentNoticePrompt, LateRentNoticeData } from '@/lib/prompts/late-rent-notice';
import { generateLeaseRenewalPrompt, LeaseRenewalData } from '@/lib/prompts/lease-renewal';
import { generateSecurityDepositReturnPrompt, SecurityDepositReturnData } from '@/lib/prompts/deposit-return';
import { generateMaintenanceResponsePrompt, MaintenanceResponseData } from '@/lib/prompts/maintenance';
import { generateMoveInOutChecklistPrompt, MoveInOutChecklistData } from '@/lib/prompts/move-in-out';
import { generateLeaseAgreementPrompt, LeaseAgreementData } from '@/lib/prompts/lease-agreement';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the existing document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if form_data exists
    if (!document.form_data) {
      return NextResponse.json({ error: 'No form data available for regeneration' }, { status: 400 });
    }

    const documentType = document.document_type;
    const formData = document.form_data as Record<string, unknown>;

    // Generate the appropriate prompt based on document type
    let prompt: string;

    switch (documentType) {
      case 'late_rent': {
        const data = formData as unknown as LateRentNoticeData;
        prompt = generateLateRentNoticePrompt(data);
        break;
      }
      case 'lease_renewal': {
        const data = formData as unknown as LeaseRenewalData;
        prompt = generateLeaseRenewalPrompt(data);
        break;
      }
      case 'deposit_return': {
        const data = formData as unknown as SecurityDepositReturnData;
        prompt = generateSecurityDepositReturnPrompt(data);
        break;
      }
      case 'maintenance': {
        const data = formData as unknown as MaintenanceResponseData;
        prompt = generateMaintenanceResponsePrompt(data);
        break;
      }
      case 'move_in_out': {
        const data = formData as unknown as MoveInOutChecklistData;
        prompt = generateMoveInOutChecklistPrompt(data);
        break;
      }
      case 'lease_agreement': {
        const data = formData as unknown as LeaseAgreementData;
        prompt = generateLeaseAgreementPrompt(data);
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    // Generate new document content using Claude
    const content = await generateDocument(DOCUMENT_SYSTEM_PROMPT, prompt);

    // Update the document with new content
    const { error: updateError } = await supabase
      .from('documents')
      .update({ content })
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        content,
      },
    });
  } catch (error) {
    console.error('Error regenerating document:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate document' },
      { status: 500 }
    );
  }
}
