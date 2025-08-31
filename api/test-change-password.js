export default async function handler(req, res) {
  console.log('Test change password endpoint hit');
  console.log('Method:', req.method);
  console.log('Body:', req.body);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Just return success for testing
  return res.status(200).json({ 
    success: true, 
    message: 'Test endpoint working',
    receivedData: req.body 
  });
}