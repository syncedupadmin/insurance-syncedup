export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    const users = [
        {
            id: '143199a3-56cf-4a51-a6c7-a3a45264ec76',
            email: 'admin@syncedupsolutions.com',
            full_name: 'System Administrator',
            role: 'super_admin',
            agency_id: 'a1111111-1111-1111-1111-111111111111',
            is_active: true,
            created_at: '2025-09-09T00:11:04.037192',
            last_login: new Date().toISOString()
        },
        {
            id: 'ba5562cb-e6d0-411a-8956-4625cb4795df',
            email: 'manager@phsagency.com',
            full_name: 'PHS Manager',
            role: 'manager',
            agency_id: 'a3333333-3333-3333-3333-333333333333',
            is_active: true,
            created_at: '2025-09-09T00:11:04.037192',
            last_login: null
        },
        {
            id: '03906bb5-3d4f-45bc-92fa-b34bce666378',
            email: 'admin@demo.com',
            full_name: 'Demo Admin',
            role: 'admin',
            agency_id: 'a2222222-2222-2222-2222-222222222222',
            is_active: true,
            created_at: '2025-09-09T00:11:04.037192',
            last_login: null
        },
        {
            id: '91094853-5a4e-469c-8b74-c6499570de89',
            email: 'agent@demo.com',
            full_name: 'Demo Agent',
            role: 'agent',
            agency_id: 'a2222222-2222-2222-2222-222222222222',
            is_active: true,
            created_at: '2025-09-09T00:11:04.037192',
            last_login: null
        }
    ];
    
    return res.status(200).json({success: true, data: users, count: users.length});
}