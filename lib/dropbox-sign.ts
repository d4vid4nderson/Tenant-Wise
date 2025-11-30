// All imports are dynamic to avoid build-time initialization
// The @dropbox/sign library initializes at import time, which fails without API keys

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

// Lazy-loaded API clients
let _signatureRequestApi: any = null;
let _embeddedApi: any = null;

async function getSignatureRequestApi() {
  if (!_signatureRequestApi) {
    const DropboxSign = await import('@dropbox/sign');
    _signatureRequestApi = new DropboxSign.SignatureRequestApi();
    _signatureRequestApi.username = process.env.DROPBOX_SIGN_API_KEY!;
  }
  return _signatureRequestApi;
}

async function getEmbeddedApi() {
  if (!_embeddedApi) {
    const DropboxSign = await import('@dropbox/sign');
    _embeddedApi = new DropboxSign.EmbeddedApi();
    _embeddedApi.username = process.env.DROPBOX_SIGN_API_KEY!;
  }
  return _embeddedApi;
}

/**
 * Create a signature request and send it to signers via email
 */
export async function createSignatureRequest(params: SignatureRequestParams) {
  const { documentTitle, documentContent, signers, message, subject } = params;
  const DropboxSign = await import('@dropbox/sign');

  // Convert markdown content to a file buffer (as text file for now)
  const fileBuffer = Buffer.from(documentContent, 'utf-8');

  const signersList = signers.map((signer, index) => ({
    emailAddress: signer.email,
    name: signer.name,
    order: index,
  }));

  const data: InstanceType<typeof DropboxSign.SignatureRequestSendRequest> = {
    title: documentTitle,
    subject: subject || `Please sign: ${documentTitle}`,
    message: message || 'Please review and sign this document at your earliest convenience.',
    signers: signersList,
    // Buffer is compatible at runtime, type assertion needed for strict typing
    files: [fileBuffer as any],
    fileUrls: undefined,
    testMode: process.env.NODE_ENV !== 'production',
  };

  try {
    const api = await getSignatureRequestApi();
    const response = await api.signatureRequestSend(data);
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
  const DropboxSign = await import('@dropbox/sign');

  // Convert content to a file buffer
  const fileBuffer = Buffer.from(documentContent, 'utf-8');

  const signersList = signers.map((signer, index) => ({
    emailAddress: signer.email,
    name: signer.name,
    order: index,
  }));

  const data: InstanceType<typeof DropboxSign.SignatureRequestCreateEmbeddedRequest> = {
    clientId: process.env.DROPBOX_SIGN_CLIENT_ID!,
    title: documentTitle,
    subject: subject || `Please sign: ${documentTitle}`,
    message: message || 'Please review and sign this document.',
    signers: signersList,
    // Buffer is compatible at runtime, type assertion needed for strict typing
    files: [fileBuffer as any],
    testMode: process.env.NODE_ENV !== 'production',
  };

  try {
    const api = await getSignatureRequestApi();
    const response = await api.signatureRequestCreateEmbedded(data);
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
    const embeddedApi = await getEmbeddedApi();
    const embeddedResponse = await embeddedApi.embeddedSignUrl(firstSignature.signatureId);

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
    const api = await getSignatureRequestApi();
    const response = await api.signatureRequestGet(signatureRequestId);
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
    const api = await getSignatureRequestApi();
    await api.signatureRequestCancel(signatureRequestId);
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
    const DropboxSign = await import('@dropbox/sign');
    const data: InstanceType<typeof DropboxSign.SignatureRequestRemindRequest> = {
      emailAddress,
    };
    const api = await getSignatureRequestApi();
    await api.signatureRequestRemind(signatureRequestId, data);
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
    const api = await getSignatureRequestApi();
    const response = await api.signatureRequestFiles(signatureRequestId, 'pdf');
    return response.body;
  } catch (error) {
    console.error('Error downloading signed document:', error);
    throw error;
  }
}

export { getSignatureRequestApi, getEmbeddedApi };
