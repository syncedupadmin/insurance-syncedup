async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method === 'GET') {
        // Return vendors list
        const vendors = [
            {
                id: 1,
                name: 'Boberdoo',
                type: 'Lead Provider',
                status: 'active',
                lastSync: '2025-01-03T14:30:00Z',
                leadsDelivered: 0,
                conversionRate: 0
            },
            {
                id: 2,
                name: 'QuoteWizard',
                type: 'Lead Provider', 
                status: 'inactive',
                lastSync: null,
                leadsDelivered: 0,
                conversionRate: 0
            }
        ];
        
        return res.status(200).json({ vendors });
    }
    
    if (req.method === 'POST') {
        // Create new vendor
        return res.status(201).json({ message: 'Vendor created successfully' });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
module.exports = handler;
