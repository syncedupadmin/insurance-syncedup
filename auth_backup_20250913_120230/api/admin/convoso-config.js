export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // In production, this would:
    // 1. Query the agencies table to get all Convoso configurations
    // 2. Aggregate campaigns, lists, and queues from all agencies
    // 3. Return the combined data for filter dropdowns
    
    // For now, return sample configuration data
    const mockConfig = {
      success: true,
      campaigns: [
        { id: 67, name: 'Default Campaign:Health Team One LLC' },
        { id: 70, name: 'AMG Dialer' },
        { id: 231, name: 'ABC Dialer' },
        { id: 2543, name: 'HCG Dialer' },
        { id: 3159, name: 'CTM Dialer' },
        { id: 4123, name: 'PHS Dialer' }
      ],
      queues: [
        { id: 'main', name: 'Main Queue' },
        { id: 'priority', name: 'Priority Queue' },
        { id: 'overflow', name: 'Overflow Queue' }
      ],
      lists: [
        { id: 238, name: 'PHS DATA - NextGen PL Plus' },
        { id: 341, name: 'PHS DATA - NextGen Shared' },
        { id: 563, name: 'PHS DATA - Refreshed Transfer' },
        { id: 781, name: 'PHS DATA - Traffic Tree S' },
        { id: 2287, name: 'AMG DATA - NG Premier List' },
        { id: 2288, name: 'AMG DATA - NextGen Shared' }
      ]
    };

    res.status(200).json(mockConfig);

  } catch (error) {
    console.error('Convoso config API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch Convoso configuration',
      details: error.message 
    });
  }
}