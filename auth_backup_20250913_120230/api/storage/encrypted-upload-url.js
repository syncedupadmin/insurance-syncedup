export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName } = req.body;
    
    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }
    
    // Generate unique filename for encrypted file
    const timestamp = Date.now();
    const secureFileName = `encrypted/${timestamp}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}.enc`;
    
    // Use your Worker URL
    const uploadUrl = `https://r2-upload-worker.proud-rice-75e1.workers.dev/${secureFileName}`;
    
    // Return the token that matches your Worker's UPLOAD_SECRET
    const token = process.env.UPLOAD_SECRET || 'your-secure-token-here';
    
    return res.status(200).json({ 
      uploadUrl,
      token,
      fileName: secureFileName,
      message: 'Encrypted upload URL and token generated'
    });
  } catch (error) {
    console.error('Error generating encrypted upload URL:', error);
    return res.status(500).json({ 
      error: 'Failed to generate upload URL',
      details: error.message 
    });
  }
}