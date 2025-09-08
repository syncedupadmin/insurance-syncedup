export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName } = req.body;
    
    // For now, return a direct R2 public URL structure
    // This assumes your bucket is public or has proper CORS
    const uploadUrl = `https://pub-5d6391c8024c40fb9f0a5b7e57d7992d.r2.dev/${fileName}`;
    
    return res.status(200).json({ 
      uploadUrl,
      message: 'URL generated (bucket must be public)' 
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate URL',
      details: error.message 
    });
  }
}