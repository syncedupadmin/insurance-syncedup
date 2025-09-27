const { requireAuth } = require('../_middleware/authCheck.js');

async function agenciesHandler(req, res) {
    const supabase = req.supabase;
    const user = req.user;

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('Agencies API - GET - User:', user.role);

        const { data: agencies, error } = await supabase
            .from('agencies')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            if (error.message?.includes('does not exist') || error.code === 'PGRST116') {
                const { data: users, error: usersError } = await supabase
                    .from('portal_users')
                    .select('agency_id')
                    .not('agency_id', 'is', null);

                if (usersError) {
                    return res.status(500).json({ error: 'Failed to fetch agencies' });
                }

                const uniqueAgencies = [...new Set(users?.map(u => u.agency_id) || [])];
                const virtualAgencies = uniqueAgencies.map(id => ({
                    id,
                    name: id === 'test-agency-001' ? 'Test Agency Alpha' :
                          id === 'test-agency-002' ? 'Test Agency Beta' :
                          'Unknown Agency',
                    type: 'agency',
                    status: 'active',
                    users_count: users?.filter(u => u.agency_id === id).length || 0,
                    revenue_mtd: 0,
                    created_at: new Date().toISOString()
                }));

                return res.status(200).json({
                    agencies: virtualAgencies,
                    total: virtualAgencies.length,
                    active: virtualAgencies.filter(a => a.status === 'active').length
                });
            }
            throw error;
        }

        const { data: userCounts } = await supabase
            .from('portal_users')
            .select('agency_id');

        const agenciesWithCounts = (agencies || []).map(agency => ({
            ...agency,
            users_count: userCounts?.filter(u => u.agency_id === agency.id).length || 0,
            revenue_mtd: agency.monthly_revenue || 0
        }));

        return res.status(200).json({
            agencies: agenciesWithCounts,
            total: agenciesWithCounts.length,
            active: agenciesWithCounts.filter(a => a.is_active === true || a.status === 'active').length
        });

    } catch (error) {
        console.error('Agencies API error:', error);
        return res.status(500).json({ error: 'Failed to fetch agencies' });
    }
}

module.exports = requireAuth(['super-admin', 'super_admin'])(agenciesHandler);