-- Add e-signature fields to documents table
-- Stores Dropbox Sign signature request information

-- Add signature request ID column
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS signature_request_id TEXT;

-- Add signature status column
-- Possible values: 'pending', 'partially_signed', 'completed', 'declined', 'cancelled', 'expired', 'error'
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS signature_status TEXT;

-- Create index for faster lookups by signature request ID
CREATE INDEX IF NOT EXISTS idx_documents_signature_request_id
ON documents(signature_request_id)
WHERE signature_request_id IS NOT NULL;

-- Create index for filtering by signature status
CREATE INDEX IF NOT EXISTS idx_documents_signature_status
ON documents(signature_status)
WHERE signature_status IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN documents.signature_request_id IS 'Dropbox Sign signature request ID';
COMMENT ON COLUMN documents.signature_status IS 'Current status of the signature request: pending, partially_signed, completed, declined, cancelled, expired, error';
