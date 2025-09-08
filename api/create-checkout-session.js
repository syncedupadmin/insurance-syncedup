import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Plan configuration
const PLAN_CONFIG = {
  agent_only: {
    name: 'Agent Only Plan',
    price: 19999, // $199.99 in cents
    description: 'Perfect for single agents',
    features: ['1 Agent', 'Basic Leaderboard', 'Commission Tracking']
  },
  starter: {
    name: 'Starter Plan',
    price: 29999, // $299.99 in cents
    description: 'Great for small agencies',
    features: ['Up to 5 Agents', 'Global Leaderboard', 'Lead Management']
  },
  professional: {
    name: 'Professional Plan',
    price: 79999, // $799.99 in cents
    description: 'Most popular for growing agencies',
    features: ['Up to 25 Agents', 'Advanced Analytics', 'API Integrations', 'Priority Support']
  },
  enterprise: {
    name: 'Enterprise Plan',
    price: 199999, // $1,999.99 in cents
    description: 'For large agencies with custom needs',
    features: ['Unlimited Agents', 'White-label', 'Custom Integrations', 'Dedicated Success Manager']
  }
};

export default async function handler(req, res) {
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
    const {
      plan_id,
      agency_name,
      admin_email,
      success_url,
      cancel_url
    } = req.body;

    // Validate plan
    const planConfig = PLAN_CONFIG[plan_id];
    if (!planConfig) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    // Validate required fields
    if (!agency_name || !admin_email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create or retrieve Stripe price
    let stripePrice;
    try {
      // Try to find existing price by lookup key
      const prices = await stripe.prices.list({
        lookup_keys: [plan_id],
        limit: 1,
      });

      if (prices.data.length > 0) {
        stripePrice = prices.data[0];
      } else {
        // Create product first
        const product = await stripe.products.create({
          name: planConfig.name,
          description: planConfig.description,
          metadata: {
            plan_id: plan_id,
            features: planConfig.features.join(', ')
          },
        });

        // Create price
        stripePrice = await stripe.prices.create({
          product: product.id,
          unit_amount: planConfig.price,
          currency: 'usd',
          recurring: {
            interval: 'month',
          },
          lookup_key: plan_id,
        });
      }
    } catch (error) {
      console.error('Error creating Stripe price:', error);
      return res.status(500).json({ 
        error: 'Failed to setup pricing',
        details: error.message 
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePrice.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer_email: admin_email,
      success_url: success_url || `${process.env.NEXT_PUBLIC_URL || 'https://insurance.syncedupsolutions.com'}/signup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${process.env.NEXT_PUBLIC_URL || 'https://insurance.syncedupsolutions.com'}/signup?plan=${plan_id}`,
      metadata: {
        plan_id: plan_id,
        agency_name: agency_name,
        admin_email: admin_email,
      },
      subscription_data: {
        metadata: {
          plan_id: plan_id,
          agency_name: agency_name,
          admin_email: admin_email,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_creation: 'always',
      phone_number_collection: {
        enabled: true,
      },
    });

    return res.status(200).json({
      success: true,
      session_id: session.id,
      url: session.url,
      plan: {
        id: plan_id,
        name: planConfig.name,
        price: planConfig.price / 100, // Convert to dollars
        description: planConfig.description,
        features: planConfig.features
      }
    });

  } catch (error) {
    console.error('Checkout session creation error:', error);

    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({ 
        error: 'Payment method error',
        details: error.message 
      });
    }

    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    });
  }
}