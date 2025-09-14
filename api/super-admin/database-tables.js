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
        // Check if user is super admin
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No authorization token' });
        }

        // Verify the token and check role
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Check if user is super admin
        if (user.user_metadata?.role !== 'super_admin' && user.app_metadata?.role !== 'super_admin') {
            return res.status(403).json({ error: 'Unauthorized - Super Admin access required' });
        }

        // Get list of tables using Supabase's built-in function
        const { data: tables, error: tablesError } = await supabase
            .rpc('list_tables_simple')
            .select('*');

        if (tablesError) {
            console.error('Error fetching tables:', tablesError);

            // Fallback: try to get tables from information_schema
            const { data: fallbackTables, error: fallbackError } = await supabase
                .from('information_schema.tables')
                .select('table_schema, table_name, table_type')
                .in('table_schema', ['public'])
                .order('table_name');

            if (fallbackError) {
                // Last resort: return known tables
                const knownTables = [
                    { table_schema: 'public', table_name: 'activities', table_type: 'BASE TABLE' },
                    { table_schema: 'public', table_name: 'agencies', table_type: 'BASE TABLE' },
                    { table_schema: 'public', table_name: 'agents', table_type: 'BASE TABLE' },
                    { table_schema: 'public', table_name: 'carriers', table_type: 'BASE TABLE' },
                    { table_schema: 'public', table_name: 'claims', table_type: 'BASE TABLE' },
                    { table_schema: 'public', table_name: 'commissions', table_type: 'BASE TABLE' },
                    { table_schema: 'public', table_name: 'customers', table_type: 'BASE TABLE' },
                    { table_schema: 'public', table_name: 'documents', table_type: 'BASE TABLE' },
                    { table_schema: 'public', table_name: 'leads', table_type: 'BASE TABLE' },
                    { table_schema: 'public', table_name: 'messages', table_type: 'BASE TABLE' },
                    { table_schema: 'public', table_name: 'notifications', table_type: 'BASE TABLE' },
                    { table_schema: 'public', table_name: 'payments', table_type: 'BASE TABLE' },
                    { table_schema: 'public', table_name: 'policies', table_type: 'BASE TABLE' },
                    { table_schema: 'public', table_name: 'portal_users', table_type: 'BASE TABLE' },
                    { table_schema: 'public', table_name: 'profiles', table_type: 'BASE TABLE' },
                    { table_schema: 'public', table_name: 'quotes', table_type: 'BASE TABLE' },
                    { table_schema: 'public', table_name: 'roles', table_type: 'BASE TABLE' },
                    { table_schema: 'public', table_name: 'tasks', table_type: 'BASE TABLE' }
                ];

                return res.status(200).json({
                    tables: knownTables,
                    warning: 'Using cached table list'
                });
            }

            return res.status(200).json({ tables: fallbackTables || [] });
        }

        return res.status(200).json({ tables: tables || [] });

    } catch (error) {
        console.error('Database tables error:', error);
        return res.status(500).json({ error: error.message });
    }
};