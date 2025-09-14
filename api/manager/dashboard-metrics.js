const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get auth token
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No authorization token' });
        }

        // Verify user and get their info
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Get user's portal info including agency_id
        const { data: managerUser, error: managerError } = await supabase
            .from('portal_users')
            .select('*')
            .eq('auth_user_id', user.id)
            .single();

        if (managerError || !managerUser) {
            return res.status(403).json({ error: 'User not found in portal' });
        }

        // Check if user is manager
        if (managerUser.role !== 'manager' && managerUser.role !== 'admin') {
            return res.status(403).json({ error: 'Manager access required' });
        }

        const agencyId = managerUser.agency_id;

        // Get team stats (agents in the same agency)
        const { data: agents, error: agentsError } = await supabase
            .from('portal_users')
            .select('*')
            .eq('agency_id', agencyId)
            .eq('role', 'agent');

        if (agentsError) {
            console.error('Error fetching agents:', agentsError);
        }

        const totalAgents = agents?.length || 0;
        const activeAgents = agents?.filter(a => a.is_active).length || 0;

        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get sales/quotes data
        const { data: quotes, error: quotesError } = await supabase
            .from('quotes')
            .select('*')
            .eq('agency_id', agencyId)
            .gte('created_at', today.toISOString())
            .lt('created_at', tomorrow.toISOString());

        const totalSales = quotes?.filter(q => q.status === 'sold').length || 0;
        const totalQuotes = quotes?.length || 0;
        const conversionRate = totalQuotes > 0
            ? Math.round((totalSales / totalQuotes) * 100) + '%'
            : '0%';

        // Calculate average premium and commission
        const soldQuotes = quotes?.filter(q => q.status === 'sold') || [];
        const totalPremium = soldQuotes.reduce((sum, q) => sum + (parseFloat(q.premium) || 0), 0);
        const avgPremium = soldQuotes.length > 0
            ? '$' + Math.round(totalPremium / soldQuotes.length).toLocaleString()
            : '$0';

        // Get commission data
        const { data: commissions, error: commissionsError } = await supabase
            .from('commissions')
            .select('*')
            .eq('agency_id', agencyId)
            .gte('created_at', today.toISOString())
            .lt('created_at', tomorrow.toISOString());

        const totalCommission = commissions?.reduce((sum, c) =>
            sum + (parseFloat(c.amount) || 0), 0) || 0;

        // Get recent activities
        const { data: activities, error: activitiesError } = await supabase
            .from('activities')
            .select('*')
            .eq('agency_id', agencyId)
            .order('created_at', { ascending: false })
            .limit(10);

        return res.status(200).json({
            success: true,
            totalAgents,
            activeAgents,
            totalSales,
            totalQuotes,
            conversionRate,
            avgPremium,
            totalCommission: '$' + totalCommission.toLocaleString(),
            recentActivities: activities || [],
            lastUpdated: new Date().toISOString()
        });

    } catch (error) {
        console.error('Dashboard metrics error:', error);
        return res.status(500).json({ error: error.message });
    }
};