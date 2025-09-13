const { verifyToken } = require('../lib/auth-bridge.js');
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Plan price mapping (in cents for Stripe)
const PLAN_PRICES = {
  agent_only: { price: 19999, name: 'Agent Only', agents: 1 },
  starter: { price: 29999, name: 'Starter', agents: 5 },
  professional: { price: 79999, name: 'Professional', agents: 25 },
  enterprise: { price: 199999, name: 'Enterprise', agents: 999999 }
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
      plan_price,
      agency_name,
      agency_phone,
      agency_state,
      agency_address,
      admin_first_name,
      admin_last_name,
      admin_email,
      admin_password,
      payment_method_id
    } = req.body;

    // Validate required fields
    if (!plan_id || !agency_name || !admin_email || !admin_password || !payment_method_id) {
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }

    // Validate plan
    const planConfig = PLAN_PRICES[plan_id];
    if (!planConfig) {
      return res.status(400).json({ 
        error: 'Invalid plan selected' 
      });
    }

    // Generate unique agency ID
    const agencyId = `AGENCY_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    console.log(`Creating subscription for agency: ${agencyId}, plan: ${plan_id}`);

    // 1. Create Stripe customer
    const customer = await stripe.customers.create({
      email: admin_email,
      name: `${admin_first_name} ${admin_last_name}`,
      metadata: {
        agency_id: agencyId,
        agency_name: agency_name,
        plan: plan_id
      },
      payment_method: payment_method_id,
      invoice_settings: {
        default_payment_method: payment_method_id,
      },
    });

    console.log(`Created Stripe customer: ${customer.id}`);

    // 2. Create Stripe product and price if they don't exist
    let stripePrice;
    try {
      // Check if price exists
      const prices = await stripe.prices.list({
        lookup_keys: [plan_id],
        expand: ['data.product']
      });

      if (prices.data.length > 0) {
        stripePrice = prices.data[0];
      } else {
        // Create product
        const product = await stripe.products.create({
          name: `SyncedUp ${planConfig.name} Plan`,
          description: `${planConfig.name} plan for up to ${planConfig.agents} agents`,
          metadata: {
            plan_id: plan_id,
            max_agents: planConfig.agents.toString()
          }
        });

        // Create price
        stripePrice = await stripe.prices.create({
          product: product.id,
          unit_amount: planConfig.price,
          currency: 'usd',
          recurring: { interval: 'month' },
          lookup_key: plan_id,
        });
      }
    } catch (error) {
      console.error('Error creating/finding Stripe price:', error);
      return res.status(500).json({ 
        error: 'Failed to setup subscription pricing',
        details: error.message 
      });
    }

    // 3. Create Stripe subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: stripePrice.id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        agency_id: agencyId,
        plan: plan_id
      }
    });

    console.log(`Created Stripe subscription: ${subscription.id}`);

    // 4. Handle payment confirmation
    const paymentIntent = subscription.latest_invoice.payment_intent;
    let paymentStatus = paymentIntent.status;

    if (paymentStatus === 'requires_action') {
      return res.status(200).json({
        success: false,
        requires_action: true,
        payment_intent: {
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret
        },
        subscription_id: subscription.id,
        agency_id: agencyId
      });
    }

    if (paymentStatus !== 'succeeded') {
      // Cancel the subscription if payment failed
      await stripe.subscriptions.cancel(subscription.id);
      return res.status(400).json({ 
        error: 'Payment failed',
        payment_status: paymentStatus
      });
    }

    // 5. Create agency in database
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .insert({
        agency_id: agencyId,
        agency_name: agency_name,
        contact_email: admin_email,
        phone: agency_phone,
        address: agency_address,
        is_active: true,
        subscription_tier: plan_id,
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (agencyError) {
      console.error('Database error creating agency:', agencyError);
      // Cancel Stripe subscription on database failure
      await stripe.subscriptions.cancel(subscription.id);
      return res.status(500).json({ 
        error: 'Failed to create agency record',
        details: agencyError.message 
      });
    }

    console.log(`Created agency in database: ${agency.id}`);

    // 6. Create admin user
    const hashedPassword = await bcrypt.hash(admin_password, 12);
    
    const { data: adminUser, error: userError } = await supabase
      .from('portal_users')
      .insert({
        agency_id: agencyId,
        full_name: `${admin_first_name} ${admin_last_name}`,
        email: admin_email.toLowerCase(),
        role: 'admin',
        agent_code: 'ADMIN',
        is_active: true,
        password_hash: hashedPassword,
        hire_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (userError) {
      console.error('Database error creating user:', userError);
      // Don't cancel subscription, but log the error
      console.error('Failed to create admin user, but subscription is active');
    } else {
      console.log(`Created admin user: ${adminUser.id}`);
    }

    // 7. Generate JWT token for immediate login
    const authToken = jwt.sign(
      {
        id: adminUser?.id || 'temp-admin',
        userId: adminUser?.id || 'temp-admin',
        email: admin_email,
        role: 'admin',
        agency_id: agencyId,
        agencyId: agencyId
      },
      process.env.JWT_SECRET || process.env.AUTH_SECRET,
      { expiresIn: '30d' }
    );

    // 8. Log the successful signup
    console.log(`✅ Subscription created successfully:
      Agency: ${agencyId} (${agency_name})
      Customer: ${customer.id}
      Subscription: ${subscription.id}
      Plan: ${plan_id}
      Status: ${subscription.status}
    `);

    return res.status(200).json({
      success: true,
      agency_id: agencyId,
      customer_id: customer.id,
      subscription_id: subscription.id,
      subscription_status: subscription.status,
      auth_token: authToken,
      redirect_url: `/admin?welcome=true&agency=${agencyId}`
    });

  } catch (error) {
    console.error('Subscription creation error:', error);
    
    // Return specific error messages
    if (error.code) {
      // Stripe error
      return res.status(400).json({ 
        error: 'Payment processing failed',
        details: error.message,
        code: error.code
      });
    }

    return res.status(500).json({ 
      error: 'Failed to create subscription',
      details: error.message 
    });
  }
}
