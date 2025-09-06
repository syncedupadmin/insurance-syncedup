-- Create documents table for Cloudflare R2 integration
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_key TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

-- Add RLS (Row Level Security) policies if needed
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Example policy to allow users to only see their own documents:
-- CREATE POLICY "Users can only see their own documents" ON documents
--     FOR ALL USING (auth.uid()::text = user_id);