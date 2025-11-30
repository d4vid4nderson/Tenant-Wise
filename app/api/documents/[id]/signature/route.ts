import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSignatureRequest, getSignatureRequestStatus, cancelSignatureRequest, sendReminder } from '@/lib/dropbox-sign';

// POST - Create a new signature request
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

    // Get the document with tenant info
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*, tenant:tenants(first_name, last_name, email)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if document already has a signature request
    if (document.signature_request_id) {
      return NextResponse.json(
        { error: 'Document already has a signature request' },
        { status: 400 }
      );
    }

    // Get landlord profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const landlordName = profile?.full_name || 'Landlord';
    const landlordEmail = profile?.email || user.email || '';

    // Get request body for optional fields
    const body = await request.json().catch(() => ({}));
    const { message, subject } = body;

    // Prepare signers - landlord first, then tenant
    const signers: Array<{ name: string; email: string; role: 'landlord' | 'tenant' }> = [
      {
        name: landlordName,
        email: landlordEmail,
        role: 'landlord',
      },
    ];

    // Add tenant if available
    if (document.tenant?.email) {
      signers.push({
        name: `${document.tenant.first_name} ${document.tenant.last_name}`,
        email: document.tenant.email,
        role: 'tenant',
      });
    }

    // Create signature request
    const result = await createSignatureRequest({
      documentTitle: document.title,
      documentContent: document.content,
      signers,
      landlordName,
      landlordEmail,
      message,
      subject,
    });

    // Update document with signature request ID
    await supabase
      .from('documents')
      .update({
        signature_request_id: result.signatureRequestId,
        signature_status: 'pending',
      })
      .eq('id', id)
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      signatureRequestId: result.signatureRequestId,
      message: 'Signature request sent successfully',
    });
  } catch (error) {
    console.error('Error creating signature request:', error);
    return NextResponse.json(
      { error: 'Failed to create signature request' },
      { status: 500 }
    );
  }
}

// GET - Get signature status
export async function GET(
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

    // Get the document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('signature_request_id, signature_status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (!document.signature_request_id) {
      return NextResponse.json({
        success: true,
        hasSignatureRequest: false,
        status: null,
      });
    }

    // Get status from Dropbox Sign
    const result = await getSignatureRequestStatus(document.signature_request_id);

    // Update local status if changed
    let newStatus = document.signature_status;
    if (result.isComplete) {
      newStatus = 'completed';
    } else if (result.signatures?.some(s => s.statusCode === 'signed')) {
      newStatus = 'partially_signed';
    }

    if (newStatus !== document.signature_status) {
      await supabase
        .from('documents')
        .update({ signature_status: newStatus })
        .eq('id', id)
        .eq('user_id', user.id);
    }

    return NextResponse.json({
      success: true,
      hasSignatureRequest: true,
      signatureRequestId: document.signature_request_id,
      status: newStatus,
      isComplete: result.isComplete,
      signatures: result.signatures?.map(s => ({
        signerEmail: s.signerEmailAddress,
        signerName: s.signerName,
        status: s.statusCode,
        signedAt: s.signedAt,
      })),
    });
  } catch (error) {
    console.error('Error getting signature status:', error);
    return NextResponse.json(
      { error: 'Failed to get signature status' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel signature request
export async function DELETE(
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

    // Get the document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('signature_request_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (!document.signature_request_id) {
      return NextResponse.json(
        { error: 'No signature request to cancel' },
        { status: 400 }
      );
    }

    // Cancel the signature request
    await cancelSignatureRequest(document.signature_request_id);

    // Update document
    await supabase
      .from('documents')
      .update({
        signature_request_id: null,
        signature_status: 'cancelled',
      })
      .eq('id', id)
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      message: 'Signature request cancelled',
    });
  } catch (error) {
    console.error('Error cancelling signature request:', error);
    return NextResponse.json(
      { error: 'Failed to cancel signature request' },
      { status: 500 }
    );
  }
}

// PATCH - Send reminder
export async function PATCH(
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

    const body = await request.json();
    const { emailAddress } = body;

    if (!emailAddress) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Get the document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('signature_request_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (!document.signature_request_id) {
      return NextResponse.json(
        { error: 'No signature request found' },
        { status: 400 }
      );
    }

    // Send reminder
    await sendReminder(document.signature_request_id, emailAddress);

    return NextResponse.json({
      success: true,
      message: 'Reminder sent successfully',
    });
  } catch (error) {
    console.error('Error sending reminder:', error);
    return NextResponse.json(
      { error: 'Failed to send reminder' },
      { status: 500 }
    );
  }
}
