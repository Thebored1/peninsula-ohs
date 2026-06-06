-- E-Signature fields for document acknowledgements and org settings
ALTER TABLE document_acknowledgements
  ADD COLUMN IF NOT EXISTS signature_image_url TEXT,
  ADD COLUMN IF NOT EXISTS signer_name TEXT;

ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS required_signature_method TEXT
    DEFAULT 'either'
    CHECK (required_signature_method IN ('draw','type','either'));
