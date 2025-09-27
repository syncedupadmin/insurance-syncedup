const { requireAuth } = require('../_middleware/authCheck.js');

async function agenciesManagementHandler(req, res) {
    const supabase = req.supabase;
    const user = req.user;

    try {
        if (req.method === 'GET') {
            console.log('Agencies Management API - GET - User:', user.role);

            const { data: agencies, error } = await supabase
                .from('agencies')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                if (error.message?.includes('does not exist') || error.code === 'PGRST116') {
                    console.log('Agencies table does not exist yet');
                    return res.status(200).json({
                        success: true,
                        agencies: []
                    });
                }
                throw error;
            }

            const agenciesWithMetrics = await Promise.all(
                (agencies || []).map(async (agency) => {
                    const { count: userCount } = await supabase
                        .from('portal_users')
                        .select('*', { count: 'exact', head: true })
                        .eq('agency_id', agency.id.toString());

                    return {
                        ...agency,
                        user_count: userCount || 0
                    };
                })
            );

            return res.status(200).json({
                success: true,
                agencies: agenciesWithMetrics
            });
        }

        if (req.method === 'PUT') {
            const { agency_id, updates } = req.body;

            if (!agency_id) {
                return res.status(400).json({
                    success: false,
                    error: 'agency_id is required'
                });
            }

            console.log('Agencies Management API - PUT - Updating agency:', agency_id);

            const cleanAgencyId = agency_id.replace(/['"]/g, '');

            const { data, error } = await supabase
                .from('agencies')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', cleanAgencyId)
                .select()
                .single();

            if (error) throw error;

            return res.status(200).json({
                success: true,
                agency: data,
                message: 'Agency updated successfully'
            });
        }

        if (req.method === 'DELETE') {
            const { id } = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'id is required'
                });
            }

            console.log('Agencies Management API - DELETE - Deleting agency:', id);

            const { count: userCount } = await supabase
                .from('portal_users')
                .select('*', { count: 'exact', head: true })
                .eq('agency_id', id);

            if (userCount && userCount > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Cannot delete agency with ${userCount} users. Please reassign or delete users first.`
                });
            }

            const { error } = await supabase
                .from('agencies')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return res.status(200).json({
                success: true,
                message: 'Agency deleted successfully'
            });
        }

        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });

    } catch (error) {
        console.error('Agencies Management API error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
}

module.exports = requireAuth(['super-admin', 'super_admin'])(agenciesManagementHandler);