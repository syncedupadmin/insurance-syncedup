// DISABLED: // DISABLED: import { requireAuth } from '../_middleware/authCheck.js';
import { verifyProductionReadiness } from '../utils/data-isolation-helper.js';

async function verifyProductionHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Running production readiness verification...');
    
    const verification = await verifyProductionReadiness();
    
    const response = {
      production_ready: verification.is_ready,
      verification_time: new Date().toISOString(),
      status: verification.is_ready ? 'READY' : 'NOT_READY',
      issues: verification.issues,
      recommendations: verification.is_ready ? [
        'System is clean and ready for production',
        'Deploy to production environment', 
        'Begin live Convoso integration',
        'Monitor dashboards for proper empty states'
      ] : [
        'Address all issues listed above',
        'Run production cleanup if needed',
        'Ensure database backup is available',
        'Re-run verification after fixes'
      ]
    };

    if (!verification.is_ready) {
      console.warn('Production readiness verification failed:', verification.issues);
    } else {
      console.log('Production readiness verification passed ✓');
    }

    return res.json(response);

  } catch (error) {
    console.error('Production verification error:', error);
    return res.status(500).json({ 
      error: 'Verification failed',
      details: error.message,
      production_ready: false,
      status: 'ERROR'
    });
  }
}

// DISABLED: export default requireAuth(['super_admin'])(verifyProductionHandler);export default verifyProductionHandler;
