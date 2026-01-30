-- Add Five9 API credential columns to five9_domains table
ALTER TABLE five9_domains
  ADD COLUMN IF NOT EXISTS five9_username text,
  ADD COLUMN IF NOT EXISTS five9_password_encrypted text,
  ADD COLUMN IF NOT EXISTS api_connection_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_connection_test timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN five9_domains.five9_username IS 'Five9 admin username for API access';
COMMENT ON COLUMN five9_domains.five9_password_encrypted IS 'Encrypted password for Five9 API access';
COMMENT ON COLUMN five9_domains.api_connection_status IS 'API connection status: pending, connected, failed';
COMMENT ON COLUMN five9_domains.last_connection_test IS 'Timestamp of last successful connection test';