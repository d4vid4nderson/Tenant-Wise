import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const SIGNWELL_API_URL = 'https://www.signwell.com/api/v1';
const SIGNWELL_API_KEY = process.env.SIGNWELL_API_KEY!;

interface Signer {
  name: string;
  email: string;
  role: 'landlord' | 'tenant';
}

interface SignatureRequestParams {
  documentTitle: string;
  documentContent: string;
  signers: Signer[];
  landlordName: string;
  landlordEmail: string;
  message?: string;
  subject?: string;
}

interface SignWellRecipient {
  id: string;
  email: string;
  name: string;
  embedded_signing_url?: string;
}

interface SignWellDocument {
  id: string;
  name: string;
  status: 'draft' | 'pending' | 'completed' | 'cancelled' | 'expired';
  created_at: string;
  completed_at: string | null;
  expires_at: string | null;
  recipients: SignWellRecipient[];
}

/**
 * Converts HTML content to plain text for PDF generation
 * Also sanitizes characters that can't be encoded in WinAnsi (standard PDF encoding)
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li>/gi, '- ')  // Use ASCII dash instead of bullet
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Replace unicode characters that can't be encoded in WinAnsi
    .replace(/[\u2610\u2611\u2612]/g, '[ ]')  // Checkbox characters
    .replace(/[\u2022\u2023\u2043]/g, '-')     // Bullet points
    .replace(/[\u2013\u2014]/g, '-')           // En-dash and em-dash
    .replace(/[\u2018\u2019]/g, "'")           // Smart quotes (single)
    .replace(/[\u201C\u201D]/g, '"')           // Smart quotes (double)
    .replace(/[\u2026]/g, '...')               // Ellipsis
    .replace(/[^\x00-\xFF]/g, '')              // Remove any remaining non-Latin1 characters
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Sanitizes text to only include characters that can be encoded in WinAnsi (Latin-1)
 */
function sanitizeForPdf(text: string): string {
  return text
    .replace(/[\u2610\u2611\u2612]/g, '[ ]')  // Checkbox characters
    .replace(/[\u2022\u2023\u2043\u25CF\u25CB]/g, '-')  // Bullet points
    .replace(/[\u2013\u2014]/g, '-')           // En-dash and em-dash
    .replace(/[\u2018\u2019\u0060\u00B4]/g, "'")  // Smart quotes (single)
    .replace(/[\u201C\u201D]/g, '"')           // Smart quotes (double)
    .replace(/[\u2026]/g, '...')               // Ellipsis
    .replace(/[\u00A0]/g, ' ')                 // Non-breaking space
    .replace(/[^\x20-\x7E\n\r\t]/g, '');       // Only allow basic ASCII printable chars, newlines, tabs
}

/**
 * Generates a PDF from plain text content
 * Returns both the PDF bytes and the page number where signatures are placed
 */
async function generatePdf(title: string, content: string): Promise<{ pdfBytes: Uint8Array; signaturePage: number; landlordSignatureY: number; tenantSignatureY: number }> {
  // Sanitize content to ensure only WinAnsi-compatible characters
  const sanitizedContent = sanitizeForPdf(content);
  const sanitizedTitle = sanitizeForPdf(title);

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612; // Letter size
  const pageHeight = 792;
  const margin = 72; // 1 inch margins
  const fontSize = 11;
  const titleFontSize = 16;
  const lineHeight = fontSize * 1.4;
  const maxWidth = pageWidth - (margin * 2);

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let pageCount = 1;
  let y = pageHeight - margin;

  // Draw title
  const titleWidth = boldFont.widthOfTextAtSize(sanitizedTitle, titleFontSize);
  page.drawText(sanitizedTitle, {
    x: (pageWidth - titleWidth) / 2,
    y: y,
    size: titleFontSize,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= titleFontSize + 30;

  // Word wrap and draw content
  const lines = sanitizedContent.split('\n');

  for (const line of lines) {
    if (line.trim() === '') {
      y -= lineHeight;
      if (y < margin + 100) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        pageCount++;
        y = pageHeight - margin;
      }
      continue;
    }

    // Word wrap long lines
    const words = line.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (textWidth > maxWidth && currentLine) {
        page.drawText(currentLine, {
          x: margin,
          y: y,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
        y -= lineHeight;
        currentLine = word;

        if (y < margin + 100) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          pageCount++;
          y = pageHeight - margin;
        }
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      page.drawText(currentLine, {
        x: margin,
        y: y,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;

      if (y < margin + 100) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        pageCount++;
        y = pageHeight - margin;
      }
    }
  }

  // Add signature section at the bottom of the last page
  // Ensure enough space for signatures
  if (y < margin + 150) {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    pageCount++;
    y = pageHeight - margin;
  }

  y -= 40;
  page.drawText('SIGNATURES', {
    x: margin,
    y: y,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  y -= 30;
  const landlordSignatureY = y;
  page.drawText('Landlord Signature: _______________________________  Date: ____________', {
    x: margin,
    y: y,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  y -= 40;
  const tenantSignatureY = y;
  page.drawText('Tenant Signature: _________________________________  Date: ____________', {
    x: margin,
    y: y,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  return {
    pdfBytes: await pdfDoc.save(),
    signaturePage: pageCount,
    landlordSignatureY,
    tenantSignatureY,
  };
}

/**
 * Creates a signature request and sends it to all signers via email
 */
export async function createSignatureRequest(params: SignatureRequestParams): Promise<{
  signatureRequestId: string;
  signatures: Array<{ signatureId: string; signerEmail: string }>;
}> {
  const {
    documentTitle,
    documentContent,
    signers,
    message,
  } = params;

  // Convert HTML to plain text and generate PDF
  const plainTextContent = htmlToPlainText(documentContent);
  const { pdfBytes, signaturePage, landlordSignatureY, tenantSignatureY } = await generatePdf(documentTitle, plainTextContent);
  const fileBase64 = Buffer.from(pdfBytes).toString('base64');

  // Prepare recipients for SignWell
  const recipients = signers.map((signer, index) => ({
    id: (index + 1).toString(),
    name: signer.name,
    email: signer.email,
  }));

  // Create signature fields for each recipient on the signature page
  // Position them at the signature line areas
  // SignWell uses top-left origin, so we need to convert from pdf-lib's bottom-left origin
  const pageHeight = 792; // Letter size height
  const fields = signers.map((signer, index) => ({
    type: 'signature',
    required: true,
    x: 170, // After "Landlord/Tenant Signature:" text
    y: pageHeight - (signer.role === 'landlord' ? landlordSignatureY : tenantSignatureY) - 20, // Convert to top-left origin
    page: signaturePage,
    recipient_id: (index + 1).toString(),
  }));

  // Create document payload
  const payload = {
    test_mode: process.env.NODE_ENV !== 'production',
    name: documentTitle,
    subject: `Please sign: ${documentTitle}`,
    message: message || 'Please review and sign the attached document.',
    reminders: true,
    recipients,
    files: [
      {
        name: `${documentTitle.replace(/[^a-zA-Z0-9 ]/g, '_')}.pdf`,
        file_base64: fileBase64,
      },
    ],
    fields: [fields], // Array of arrays - one array per file
  };

  try {
    const response = await fetch(`${SIGNWELL_API_URL}/documents`, {
      method: 'POST',
      headers: {
        'X-Api-Key': SIGNWELL_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('SignWell API Error:', response.status, errorData);

      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your SIGNWELL_API_KEY in .env.local');
      } else if (response.status === 403) {
        throw new Error('API access denied. Please check your SignWell account permissions.');
      } else if (response.status === 422) {
        throw new Error(`Validation error: ${JSON.stringify(errorData)}`);
      }
      throw new Error(`SignWell API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const result: SignWellDocument = await response.json();
    console.log('SignWell document created:', result.id);

    // Document is automatically sent when created (without draft: true)
    // No need to call sendDocument separately

    return {
      signatureRequestId: result.id,
      signatures: result.recipients.map(r => ({
        signatureId: r.id,
        signerEmail: r.email,
      })),
    };
  } catch (error) {
    console.error('SignWell API Error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create signature request');
  }
}

/**
 * Sends a document for signing (transitions from draft to pending)
 */
async function sendDocument(documentId: string): Promise<void> {
  const response = await fetch(`${SIGNWELL_API_URL}/documents/${documentId}/send`, {
    method: 'POST',
    headers: {
      'X-Api-Key': SIGNWELL_API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Failed to send document:', response.status, errorData);
    throw new Error(`Failed to send document for signing: ${response.status}`);
  }
}

/**
 * Gets the current status of a signature request
 */
export async function getSignatureRequestStatus(documentId: string): Promise<{
  isComplete: boolean;
  isDeclined: boolean;
  hasError: boolean;
  status: string;
  signatures: Array<{
    signerEmailAddress: string;
    signerName: string;
    statusCode: string;
    signedAt: number | null;
  }>;
}> {
  try {
    const response = await fetch(`${SIGNWELL_API_URL}/documents/${documentId}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': SIGNWELL_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get document status: ${response.status}`);
    }

    const result: SignWellDocument = await response.json();

    return {
      isComplete: result.status === 'completed',
      isDeclined: result.status === 'cancelled',
      hasError: false,
      status: result.status,
      signatures: result.recipients.map(r => ({
        signerEmailAddress: r.email,
        signerName: r.name,
        statusCode: result.status,
        signedAt: result.completed_at ? new Date(result.completed_at).getTime() / 1000 : null,
      })),
    };
  } catch (error) {
    console.error('Error getting signature status:', error);
    throw new Error('Failed to get signature request status');
  }
}

/**
 * Cancels a signature request
 */
export async function cancelSignatureRequest(documentId: string): Promise<void> {
  try {
    const response = await fetch(`${SIGNWELL_API_URL}/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        'X-Api-Key': SIGNWELL_API_KEY,
      },
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to cancel document: ${response.status}`);
    }
  } catch (error) {
    console.error('Error cancelling signature request:', error);
    throw new Error('Failed to cancel signature request');
  }
}

/**
 * Sends a reminder to a signer
 */
export async function sendReminder(documentId: string, emailAddress: string): Promise<void> {
  try {
    const response = await fetch(`${SIGNWELL_API_URL}/documents/${documentId}/remind`, {
      method: 'POST',
      headers: {
        'X-Api-Key': SIGNWELL_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipients: [emailAddress],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send reminder: ${response.status}`);
    }
  } catch (error) {
    console.error('Error sending reminder:', error);
    throw new Error('Failed to send reminder');
  }
}

/**
 * Downloads the signed document as PDF
 */
export async function downloadSignedDocument(documentId: string): Promise<Buffer> {
  try {
    const response = await fetch(`${SIGNWELL_API_URL}/documents/${documentId}/completed_pdf`, {
      method: 'GET',
      headers: {
        'X-Api-Key': SIGNWELL_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error downloading signed document:', error);
    throw new Error('Failed to download signed document');
  }
}
