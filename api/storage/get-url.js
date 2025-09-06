import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const { fileId } = req.query;

        if (!fileId) {
            return res.status(400).json({ error: 'fileId is required' });
        }

        // Get file record from database
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('id', fileId)
            .eq('user_id', userId)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'File not found' });
        }

        if (data.status !== 'completed') {
            return res.status(400).json({ error: 'File upload not completed' });
        }

        // Generate presigned URL for download
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: data.file_key,
        });

        const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        res.status(200).json({
            downloadUrl,
            fileName: data.file_name,
            fileType: data.file_type,
            fileSize: data.file_size
        });

    } catch (error) {
        console.error('Download URL generation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}