export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        // Check email service configuration
        const emailConfig = {
            smtp_host: process.env.SMTP_HOST,
            smtp_user: process.env.SMTP_USER,
            smtp_pass: process.env.SMTP_PASS,
            smtp_port: process.env.SMTP_PORT,
            sendgrid_key: process.env.SENDGRID_API_KEY,
            mailgun_key: process.env.MAILGUN_API_KEY
        };
        
        // Determine which email service is configured
        let provider = 'none';
        let isConfigured = false;
        
        if (emailConfig.sendgrid_key) {
            provider = 'SendGrid';
            isConfigured = true;
        } else if (emailConfig.mailgun_key) {
            provider = 'Mailgun';
            isConfigured = true;
        } else if (emailConfig.smtp_host && emailConfig.smtp_user && emailConfig.smtp_pass) {
            provider = emailConfig.smtp_host;
            isConfigured = true;
        }
        
        const status = isConfigured ? 'operational' : 'not_configured';
        
        return res.status(200).json({
            status: status,
            provider: provider,
            configured: isConfigured,
            timestamp: new Date().toISOString(),
            details: {
                smtp_configured: !!(emailConfig.smtp_host && emailConfig.smtp_user),
                sendgrid_configured: !!emailConfig.sendgrid_key,
                mailgun_configured: !!emailConfig.mailgun_key
            }
        });
        
    } catch (error) {
        console.error('Email health check failed:', error);
        return res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}