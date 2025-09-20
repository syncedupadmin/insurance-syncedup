// Standardized cookie-based authentication helper
const { verifyToken } = require('../../lib/auth-bridge.js');

function getCookie(req, name) {
    const m = (req.headers.cookie || "").match(new RegExp(`(?:^|; )${name}=([^;]+)`));
    return m ? decodeURIComponent(m[1]) : null;
}

async function verifyCookieAuth(req) {
    // Check for cookie-based token first
    const token = getCookie(req, "auth_token");

    // Fallback to Bearer token if no cookie (for backwards compatibility)
    const bearerToken = req.headers.authorization?.replace('Bearer ', '');

    const finalToken = token || bearerToken;

    if (!finalToken) {
        return { success: false, error: 'No authorization token' };
    }

    try {
        const payload = await verifyToken(finalToken);
        if (!payload) {
            return { success: false, error: 'Invalid token' };
        }

        // Normalize role (handle super-admin vs super_admin)
        const normalizedRole = payload.role?.toLowerCase().replace(/-/g, '_');

        return {
            success: true,
            user: {
                ...payload,
                normalizedRole
            }
        };
    } catch (error) {
        return { success: false, error: 'Token verification failed' };
    }
}

function requireRole(allowedRoles) {
    return async (req, res, next) => {
        const auth = await verifyCookieAuth(req);

        if (!auth.success) {
            return res.status(401).json({ error: auth.error });
        }

        const normalizedAllowed = allowedRoles.map(r => r.toLowerCase().replace(/-/g, '_'));
        if (!normalizedAllowed.includes(auth.user.normalizedRole)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        req.user = auth.user;
        if (next) next();
    };
}

module.exports = {
    getCookie,
    verifyCookieAuth,
    requireRole
};