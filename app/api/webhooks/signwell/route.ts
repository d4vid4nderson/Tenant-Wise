import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role client for webhook (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SignWellWebhookPayload {
  event_type: string;
  document: {
    id: string;
    name: string;
    status: string;
    completed_at?: string;
  };
  recipient?: {
    id: string;
    email: string;
    name: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload: SignWellWebhookPayload = await request.json();
    const { event_type, document } = payload;

    console.log('SignWell webhook received:', event_type, document.id);

    // Find the document in our database by signature_request_id
    const { data: doc, error: findError } = await supabase
      .from('documents')
      .select('id, signature_status')
      .eq('signature_request_id', document.id)
      .single();

    if (findError || !doc) {
      console.log('Document not found for signature_request_id:', document.id);
      // Return 200 to acknowledge receipt even if we don't have the document
      return NextResponse.json({ received: true });
    }

    // Update document status based on event type
    let newStatus: string | null = null;

    switch (event_type) {
      case 'document_completed':
        newStatus = 'completed';
        break;
      case 'document_signed':
        // Individual signer signed (might be partially signed)
        newStatus = 'partially_signed';
        break;
      case 'document_viewed':
        // Someone viewed the document
        if (doc.signature_status === 'pending') {
          newStatus = 'viewed';
        }
        break;
      case 'document_declined':
        newStatus = 'declined';
        break;
      case 'document_expired':
        newStatus = 'expired';
        break;
      case 'document_sent':
        newStatus = 'pending';
        break;
      default:
        console.log('Unhandled webhook event type:', event_type);
    }

    if (newStatus && newStatus !== doc.signature_status) {
      const updateData: Record<string, unknown> = {
        signature_status: newStatus,
      };

      // If completed, also mark as sent
      if (newStatus === 'completed') {
        updateData.sent = true;
      }

      await supabase
        .from('documents')
        .update(updateData)
        .eq('id', doc.id);

      console.log('Updated document', doc.id, 'status to', newStatus);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing SignWell webhook:', error);
    // Return 200 to prevent retries for malformed requests
    return NextResponse.json({ received: true, error: 'Processing error' });
  }
}

// SignWell may send GET requests to verify the webhook URL
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'signwell-webhook' });
}
