export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // In production, this would:
    // 1. Query the agencies table to get Convoso lists
    // 2. Or call the Convoso API directly to get fresh list data
    // 3. Return all available lists for the authenticated user's agency
    
    // For now, return sample lists data
    const mockLists = {
      success: true,
      lists: [
        { 
          id: 238, 
          name: 'PHS DATA - NextGen PL Plus',
          status: 'N',
          lead_count: 1250,
          agency: 'PHS'
        },
        { 
          id: 341, 
          name: 'PHS DATA - NextGen Shared',
          status: 'N',
          lead_count: 850,
          agency: 'PHS'
        },
        { 
          id: 563, 
          name: 'PHS DATA - Refreshed Transfer',
          status: 'Y',
          lead_count: 425,
          agency: 'PHS'
        },
        { 
          id: 781, 
          name: 'PHS DATA - Traffic Tree S',
          status: 'N',
          lead_count: 675,
          agency: 'PHS'
        },
        { 
          id: 782, 
          name: 'PHS DATA - Traffic Tree X',
          status: 'N',
          lead_count: 320,
          agency: 'PHS'
        },
        { 
          id: 2287, 
          name: 'AMG DATA - NG Premier List',
          status: 'Y',
          lead_count: 980,
          agency: 'AMG'
        },
        { 
          id: 2288, 
          name: 'AMG DATA - NextGen Shared',
          status: 'Y',
          lead_count: 1150,
          agency: 'AMG'
        }
      ]
    };

    res.status(200).json(mockLists);

  } catch (error) {
    console.error('Convoso lists API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch Convoso lists',
      details: error.message 
    });
  }
}