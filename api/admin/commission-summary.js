export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Return commission summary data
    const summary = {
        thisMonth: 0,
        avgRate: 15.0,
        pending: 0,
        totalPaid: 0,
        agentsWithCommissions: 0
    };
    
    return res.status(200).json(summary);
}