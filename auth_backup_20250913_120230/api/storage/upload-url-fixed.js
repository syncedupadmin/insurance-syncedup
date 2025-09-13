const workerUrl = process.env.R2_WORKER_URL || 'https://r2-upload-worker.proud-rice-75e1.workers.dev';

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
    const { fileName, fileType } = req.body;
    
    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }
    
    // Generate upload URL using Cloudflare Worker (no /upload/ prefix needed)
    const uploadUrl = `${workerUrl}/${encodeURIComponent(fileName)}`;
    
    return res.status(200).json({ 
      uploadUrl,
      message: 'Worker upload URL generated successfully',
      worker: workerUrl
    });
  } catch (error) {
    console.error('Error generating worker URL:', error);
    return res.status(500).json({ 
      error: 'Failed to generate upload URL',
      details: error.message 
    });
  }
}