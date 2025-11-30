import * as DropboxSign from '@dropbox/sign';

// Lazy-load API clients to avoid initialization during build
let _signatureRequestApi: DropboxSign.SignatureRequestApi | null = null;
let _embeddedApi: DropboxSign.EmbeddedApi | null = null;

function getSignatureRequestApi() {
  if (!_signatureRequestApi) {
    _signatureRequestApi = new DropboxSign.SignatureRequestApi();
    _signatureRequestApi.username = process.env.DROPBOX_SIGN_API_KEY!;
  }
  return _signatureRequestApi;
}

function getEmbeddedApi() {
  if (!_embeddedApi) {
    _embeddedApi = new DropboxSign.EmbeddedApi();
    _embeddedApi.username = process.env.DROPBOX_SIGN_API_KEY!;
  }
  return _embeddedApi;
}

export interface SignatureRequestParams {
  documentTitle: string;
  documentContent: string;
  signers: {
    name: string;
    email: string;
    role: 'landlord' | 'tenant';
  }[];
  landlordName: string;
  landlordEmail: string;
  message?: string;
  subject?: string;
}

export interface EmbeddedSignatureResult {
  signatureRequestId: string;
  signUrl: string;
}

/**
 * Create a signature request and send it to signers via email
 */
export async function createSignatureRequest(params: SignatureRequestParams) {
  const { documentTitle, documentContent, signers, message, subject } = params;

  // Convert markdown content to a file buffer (as text file for now)
  const fileBuffer = Buffer.from(documentContent, 'utf-8');

  const signersList = signers.map((signer, index) => ({
    emailAddress: signer.email,
    name: signer.name,
    order: index,
  }));

  const data: DropboxSign.SignatureRequestSendRequest = {
    title: documentTitle,
    subject: subject || `Please sign: ${documentTitle}`,
    message: message || 'Please review and sign this document at your earliest convenience.',
    signers: signersList,
    // Buffer is compatible at runtime, type assertion needed for strict typing
    files: [fileBuffer as unknown as DropboxSign.RequestFile],
    fileUrls: undefined,
    testMode: process.env.NODE_ENV !== 'production',
  };

  try {
    const response = await getSignatureRequestApi().signatureRequestSend(data);
    return {
      success: true,
      signatureRequestId: response.body.signatureRequest?.signatureRequestId,
      signatures: response.body.signatureRequest?.signatures,
    };
  } catch (error) {
    console.error('Error creating signature request:', error);
    throw error;
  }
}

/**
 * Create an embedded signature request (for in-app signing)
 */
export async function createEmbeddedSignatureRequest(params: SignatureRequestParams): Promise<EmbeddedSignatureResult> {
  const { documentTitle, documentContent, signers, message, subject } = params;

  // Convert content to a file buffer
  const fileBuffer = Buffer.from(documentContent, 'utf-8');

  const signersList = signers.map((signer, index) => ({
    emailAddress: signer.email,
    name: signer.name,
    order: index,
  }));

  const data: DropboxSign.SignatureRequestCreateEmbeddedRequest = {
    clientId: process.env.DROPBOX_SIGN_CLIENT_ID!,
    title: documentTitle,
    subject: subject || `Please sign: ${documentTitle}`,
    message: message || 'Please review and sign this document.',
    signers: signersList,
    // Buffer is compatible at runtime, type assertion needed for strict typing
    files: [fileBuffer as unknown as DropboxSign.RequestFile],
    testMode: process.env.NODE_ENV !== 'production',
  };

  try {
    const response = await getSignatureRequestApi().signatureRequestCreateEmbedded(data);
    const signatureRequestId = response.body.signatureRequest?.signatureRequestId;

    if (!signatureRequestId) {
      throw new Error('No signature request ID returned');
    }

    // Get the first signer's signature ID
    const firstSignature = response.body.signatureRequest?.signatures?.[0];
    if (!firstSignature?.signatureId) {
      throw new Error('No signature ID found');
    }

    // Get the embedded sign URL
    const embeddedResponse = await getEmbeddedApi().embeddedSignUrl(firstSignature.signatureId);

    return {
      signatureRequestId,
      signUrl: embeddedResponse.body.embedded?.signUrl || '',
    };
  } catch (error) {
    console.error('Error creating embedded signature request:', error);
    throw error;
  }
}

/**
 * Get the status of a signature request
 */
export async function getSignatureRequestStatus(signatureRequestId: string) {
  try {
    const response = await getSignatureRequestApi().signatureRequestGet(signatureRequestId);
    return {
      success: true,
      signatureRequest: response.body.signatureRequest,
      isComplete: response.body.signatureRequest?.isComplete,
      signatures: response.body.signatureRequest?.signatures,
    };
  } catch (error) {
    console.error('Error getting signature request status:', error);
    throw error;
  }
}

/**
 * Cancel a signature request
 */
export async function cancelSignatureRequest(signatureRequestId: string) {
  try {
    await getSignatureRequestApi().signatureRequestCancel(signatureRequestId);
    return { success: true };
  } catch (error) {
    console.error('Error canceling signature request:', error);
    throw error;
  }
}

/**
 * Send a reminder to a signer
 */
export async function sendReminder(signatureRequestId: string, emailAddress: string) {
  try {
    const data: DropboxSign.SignatureRequestRemindRequest = {
      emailAddress,
    };
    await getSignatureRequestApi().signatureRequestRemind(signatureRequestId, data);
    return { success: true };
  } catch (error) {
    console.error('Error sending reminder:', error);
    throw error;
  }
}

/**
 * Download the signed document
 */
export async function downloadSignedDocument(signatureRequestId: string) {
  try {
    const response = await getSignatureRequestApi().signatureRequestFiles(signatureRequestId, 'pdf');
    return response.body;
  } catch (error) {
    console.error('Error downloading signed document:', error);
    throw error;
  }
}

export { getSignatureRequestApi, getEmbeddedApi };
