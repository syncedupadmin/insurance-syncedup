import { createClient } from '@supabase/supabase-js';
import { 
  parseEmailContent, 
  calculateCancellationImpact, 
  getMockCancellations 
} from './utils/cancellationHelpers.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Handle cancellation email processing
    const { emailContent } = req.body;

    if (!emailContent || !emailContent.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email content is required' 
      });
    }

    try {
      // Parse the email content
      const parsedData = parseEmailContent(emailContent);
      
      // Calculate cancellation impact
      const impact = calculateCancellationImpact(parsedData);

      // Return success response with accurate chargeback/cancellation details
      res.status(200).json({
        success: true,
        message: `${impact.processingType}: ${parsedData.customerName}. ${impact.reason}`,
        processing: {
          type: impact.processingType,
          isChargeback: impact.isChargeback,
          amount: impact.isChargeback ? -impact.chargebackAmount : 0, // Negative only if chargeback
          reason: impact.reason,
          daysInForce: impact.daysInForce,
          originalCommission: parsedData.originalCommission,
          wasAgentPaidOut: impact.wasAgentPaidOut
        },
        parsedData: {
          ...parsedData,
          daysInForce: impact.daysInForce,
          processingType: impact.processingType
        }
      });

    } catch (error) {
      console.error('Cancellation processing error:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing cancellation: ' + error.message
      });
    }

  } else if (req.method === 'GET') {
    // Handle listing cancellations by timeframe (for dashboard)
    const { agentId, timeframe } = req.query;

    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }

    try {
      // Get mock cancellations for the specified timeframe
      const cancellations = getMockCancellations(agentId, timeframe);
      res.status(200).json(cancellations);

    } catch (error) {
      console.error('Cancellations list error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch cancellations', 
        details: error.message 
      });
    }

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}