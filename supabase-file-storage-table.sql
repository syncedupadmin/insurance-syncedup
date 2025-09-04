-- Create file_storage table for Cloudflare R2 integration
CREATE TABLE IF NOT EXISTS file_storage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_key VARCHAR(1000) NOT NULL UNIQUE,
    file_type VARCHAR(100),
    file_size BIGINT,
    upload_status VARCHAR(50) DEFAULT 'pending' CHECK (upload_status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_file_storage_user_id ON file_storage(user_id);
CREATE INDEX IF NOT EXISTS idx_file_storage_upload_status ON file_storage(upload_status);
CREATE INDEX IF NOT EXISTS idx_file_storage_created_at ON file_storage(created_at);

-- Add RLS (Row Level Security) policies if needed
-- ALTER TABLE file_storage ENABLE ROW LEVEL SECURITY;

-- Example policy to allow users to only see their own files:
-- CREATE POLICY "Users can only see their own files" ON file_storage
--     FOR ALL USING (auth.uid()::text = user_id);

-- Update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_file_storage_updated_at BEFORE UPDATE
    ON file_storage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();