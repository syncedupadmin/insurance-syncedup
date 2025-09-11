import { createClient } from '@supabase/supabase-js';
const { verifySuperAdmin } = require('./_auth-helper');
import bcrypt from 'bcryptjs';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Verify super-admin authentication
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
        
        const user = await verifySuperAdmin(token);
        if (!user) {
            return res.status(403).json({ error: 'Super admin privileges required' });
        };

        if (!demoAccounts[email]) {
            return res.status(404).json({ error: 'Demo account not found' });
        }

        // Check if the role matches
        if (demoAccounts[email].role !== role) {
            return res.status(400).json({ error: 'Role mismatch for demo account' });
        }

        // Try to find the demo agency first
        let { data: demoAgency } = await supabase
            .from('agencies')
            .select('*')
            .eq('code', 'DEMO001')
            .single();

        // If demo agency doesn't exist, create it
        if (!demoAgency) {
            const { data: newAgency, error: agencyError } = await supabase
                .from('agencies')
                .insert([{
                    name: 'Demo Insurance Agency',
                    code: 'DEMO001',
                    admin_email: 'admin@demo.com',
                    is_active: true,
                    is_demo: true,
                    settings: {
                        plan_type: 'enterprise',
                        status: 'active',
                        monthly_revenue: 299,
                        features: {
                            api_access: true,
                            csv_upload: true,
                            advanced_reporting: true,
                            white_labeling: true
                        },
                        billing: {
                            cycle: 'monthly',
                            auto_renewal: true,
                            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                        }
                    },
                    commission_split: 20,
                    pay_period: 'monthly',
                    pay_day: 1,
                    participate_global_leaderboard: true,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (agencyError) {
                console.error('Error creating demo agency:', agencyError);
                return res.status(500).json({ error: 'Failed to create demo agency' });
            }

            demoAgency = newAgency;
        }

        // Try to find the demo user
        let { data: demoUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('agency_id', demoAgency.id)
            .single();

        // If demo user doesn't exist, create it
        if (!demoUser) {
            const hashedPassword = await bcrypt.hash('demo123!', 12);
            
            const { data: newUser, error: userError } = await supabase
                .from('users')
                .insert([{
                    email: email,
                    password_hash: hashedPassword,
                    name: demoAccounts[email].name,
                    role: role,
                    agency_id: demoAgency.id,
                    is_active: true,
                    must_change_password: false,
                    login_count: 0
                }])
                .select()
                .single();

            if (userError) {
                console.error('Error creating demo user:', userError);
                return res.status(500).json({ error: 'Failed to create demo user' });
            }

            demoUser = newUser;
        }

        // Generate demo token
        const demoToken = jwt.sign(
            {
                id: demoUser.id,
                email: demoUser.email,
                role: demoUser.role,
                agency_id: demoUser.agency_id,
                agency_code: demoAgency.code,
                name: demoUser.name,
                demo: true
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '24h' }
        );

        // Update login count
        await supabase
            .from('users')
            .update({ 
                login_count: (demoUser.login_count || 0) + 1,
                last_login: new Date().toISOString()
            })
            .eq('id', demoUser.id);

        return res.status(200).json({
            success: true,
            token: demoToken,
            user: {
                id: demoUser.id,
                email: demoUser.email,
                name: demoUser.name,
                role: demoUser.role,
                agency_id: demoUser.agency_id,
                agency_code: demoAgency.code,
                is_demo: true
            },
            message: `Logged in as ${demoAccounts[email].name}`
        });

    } catch (error) {
        console.error('Demo login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}