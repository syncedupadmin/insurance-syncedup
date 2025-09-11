import { createClient } from '@supabase/supabase-js';
const { verifySuperAdmin } = require('./_auth-helper');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
        
        const user = await verifySuperAdmin(token);
        if (!user) {
            return res.status(403).json({ error: 'Super admin privileges required' });
        });
        }

        const allowedRoles = ['super-admin', 'super_admin', 'admin'];
        if (!allowedRoles.includes(decoded.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const securitySettings = {
            two_factor_required: true,
            password_policy: {
                min_length: 8,
                require_uppercase: true,
                require_lowercase: true,
                require_numbers: true,
                require_symbols: true,
                password_expiry_days: 90
            },
            session_settings: {
                timeout_minutes: 30,
                concurrent_sessions: 3,
                require_reauth_for_sensitive: true
            },
            ip_filtering: {
                enabled: true,
                whitelist_mode: false,
                max_failed_attempts: 5,
                lockout_duration_minutes: 30
            },
            audit_logging: {
                enabled: true,
                retention_days: 365,
                log_all_actions: true,
                export_enabled: true
            }
        };

        return res.status(200).json({
            success: true,
            data: securitySettings
        });

    } catch (error) {
        console.error('Security settings API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}