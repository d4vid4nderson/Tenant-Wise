import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Use service role for webhook processing (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DropboxSignEvent {
  event: {
    event_type: string;
    event_time: string;
    event_hash: string;
    event_metadata: {
      related_signature_id?: string;
      reported_for_account_id?: string;
      reported_for_app_id?: string;
    };
  };
  signature_request?: {
    signature_request_id: string;
    title: string;
    is_complete: boolean;
    is_declined: boolean;
    has_error: boolean;
    signatures: Array<{
      signature_id: string;
      signer_email_address: string;
      signer_name: string;
      status_code: string;
      signed_at?: number;
    }>;
  };
}

// Verify webhook signature
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const apiKey = process.env.DROPBOX_SIGN_API_KEY;
  if (!apiKey) return false;

  const expectedSignature = crypto
    .createHmac('sha256', apiKey)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Parse the JSON payload
    let event: DropboxSignEvent;
    try {
      const parsed = JSON.parse(body);
      event = parsed;
    } catch {
      // Dropbox Sign sends form data for callback test
      if (body.includes('Hello API Event Received')) {
        return new NextResponse('Hello API Event Received', { status: 200 });
      }
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Handle callback test (Dropbox Sign validation)
    if (event.event?.event_type === 'callback_test') {
      return new NextResponse('Hello API Event Received', { status: 200 });
    }

    const signatureRequestId = event.signature_request?.signature_request_id;
    if (!signatureRequestId) {
      return NextResponse.json({ error: 'No signature request ID' }, { status: 400 });
    }

    // Find the document with this signature request
    const { data: document, error: findError } = await supabase
      .from('documents')
      .select('id, user_id')
      .eq('signature_request_id', signatureRequestId)
      .single();

    if (findError || !document) {
      console.log('Document not found for signature request:', signatureRequestId);
      // Still return 200 to acknowledge receipt
      return NextResponse.json({ received: true });
    }

    // Determine the new status based on event type
    let newStatus: string | null = null;

    switch (event.event.event_type) {
      case 'signature_request_sent':
        newStatus = 'pending';
        break;

      case 'signature_request_viewed':
        // Keep as pending, but could track this separately
        break;

      case 'signature_request_signed':
        // Check if all signatures are complete
        if (event.signature_request?.is_complete) {
          newStatus = 'completed';
        } else {
          newStatus = 'partially_signed';
        }
        break;

      case 'signature_request_all_signed':
        newStatus = 'completed';
        break;

      case 'signature_request_declined':
        newStatus = 'declined';
        break;

      case 'signature_request_canceled':
        newStatus = 'cancelled';
        break;

      case 'signature_request_expired':
        newStatus = 'expired';
        break;

      case 'signature_request_invalid':
        newStatus = 'error';
        break;
    }

    // Update the document status if we have a new status
    if (newStatus) {
      await supabase
        .from('documents')
        .update({ signature_status: newStatus })
        .eq('id', document.id);

      console.log(`Updated document ${document.id} signature status to ${newStatus}`);
    }

    // Log the event for debugging
    console.log('Dropbox Sign webhook event:', {
      eventType: event.event.event_type,
      signatureRequestId,
      documentId: document.id,
      newStatus,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    // Return 200 to prevent retries for unrecoverable errors
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 200 });
  }
}

// Handle GET for webhook verification
export async function GET() {
  return new NextResponse('Hello API Event Received', { status: 200 });
}
