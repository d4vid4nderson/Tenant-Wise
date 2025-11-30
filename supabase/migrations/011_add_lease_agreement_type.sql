-- Add 'lease_agreement' to the document_type check constraint

-- Drop the existing constraint
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_document_type_check;

-- Create updated constraint with lease_agreement included
ALTER TABLE documents ADD CONSTRAINT documents_document_type_check
CHECK (document_type IN ('late_rent', 'lease_renewal', 'maintenance', 'move_in_out', 'deposit_return', 'lease_agreement', 'other'));
