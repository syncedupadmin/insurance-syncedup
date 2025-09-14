const { verifyToken } = require('../lib/auth-bridge.js');
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
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
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = await verifyToken(, ["auth_token","auth-token","user_role","user_roles","assumed_role"]);
        const userId = decoded.id;

        const { fileName, fileType, fileSize } = req.body;

        if (!fileName || !fileType) {
            return res.status(400).json({ error: 'fileName and fileType are required' });
        }

        // Generate unique key
        const timestamp = Date.now();
        const fileKey = `${userId}/${timestamp}_${fileName}`;

        // Create presigned URL for upload
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey,
            ContentType: fileType,
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        // Store file record in database
        const { data, error } = await supabase
            .from('documents')
            .insert([
                {
                    user_id: userId,
                    file_name: fileName,
                    file_key: fileKey,
                    file_type: fileType,
                    file_size: fileSize || null,
                    status: 'pending'
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Database error' });
        }

        res.status(200).json({
            uploadUrl,
            fileId: data.id,
            fileKey
        });

    } catch (error) {
        console.error('Upload URL generation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
