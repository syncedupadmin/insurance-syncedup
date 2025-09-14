import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Received webhook event: ${event.type}`);

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
        
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleSubscriptionCreated(subscription) {
  console.log('Subscription created:', subscription.id);
  
  const agencyId = subscription.metadata.agency_id;
  if (!agencyId) {
    console.error('No agency_id in subscription metadata');
    return;
  }

  // Update agency with subscription details
  const { error } = await supabase
    .from('agencies')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      subscription_tier: subscription.metadata.plan_id || 'professional',
      updated_at: new Date().toISOString()
    })
    .eq('agency_id', agencyId);

  if (error) {
    console.error('Failed to update agency subscription:', error);
  } else {
    console.log(`Updated agency ${agencyId} subscription status`);
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id);
  
  const agencyId = subscription.metadata.agency_id;
  if (!agencyId) {
    console.error('No agency_id in subscription metadata');
    return;
  }

  // Update subscription status
  const { error } = await supabase
    .from('agencies')
    .update({
      subscription_status: subscription.status,
      subscription_tier: subscription.metadata.plan_id,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Failed to update subscription:', error);
  } else {
    console.log(`Updated subscription ${subscription.id} status to ${subscription.status}`);
  }

  // If subscription was cancelled, deactivate agency
  if (subscription.status === 'canceled') {
    await supabase
      .from('agencies')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    // Deactivate all users in the agency
    await supabase
      .from('portal_users')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('agency_id', agencyId);

    console.log(`Deactivated agency ${agencyId} due to subscription cancellation`);
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  const agencyId = subscription.metadata.agency_id;
  if (!agencyId) {
    console.error('No agency_id in subscription metadata');
    return;
  }

  // Mark agency as inactive
  const { error } = await supabase
    .from('agencies')
    .update({
      is_active: false,
      subscription_status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Failed to deactivate agency:', error);
  } else {
    console.log(`Deactivated agency ${agencyId}`);
  }

  // Deactivate all users in the agency
  await supabase
    .from('portal_users')
    .update({
      is_active: false,
      deactivated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('agency_id', agencyId);
}

async function handlePaymentSucceeded(invoice) {
  console.log('Payment succeeded for invoice:', invoice.id);
  
  if (invoice.subscription) {
    // Update subscription as active if payment succeeded
    const { data: agency } = await supabase
      .from('agencies')
      .select('agency_id')
      .eq('stripe_subscription_id', invoice.subscription)
      .single();

    if (agency) {
      await supabase
        .from('agencies')
        .update({
          is_active: true,
          subscription_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', invoice.subscription);

      // Reactivate users if they were deactivated due to payment failure
      await supabase
        .from('portal_users')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('agency_id', agency.agency_id)
        .eq('deactivated_at', null);

      console.log(`Reactivated agency ${agency.agency_id} after successful payment`);
    }
  }
}

async function handlePaymentFailed(invoice) {
  console.log('Payment failed for invoice:', invoice.id);
  
  if (invoice.subscription) {
    const { data: agency } = await supabase
      .from('agencies')
      .select('agency_id, contact_email')
      .eq('stripe_subscription_id', invoice.subscription)
      .single();

    if (agency) {
      // Don't immediately deactivate on first failure, but log it
      console.log(`Payment failed for agency ${agency.agency_id}`);
      
      // Update status but keep active for grace period
      await supabase
        .from('agencies')
        .update({
          subscription_status: 'past_due',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', invoice.subscription);

      // TODO: Send payment failure notification email
      console.log(`Should send payment failure email to ${agency.contact_email}`);
    }
  }
}

async function handleCheckoutCompleted(session) {
  console.log('Checkout completed:', session.id);
  
  if (session.mode === 'subscription' && session.subscription) {
    // Get the subscription details
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    
    // Extract metadata
    const agencyName = session.metadata.agency_name || session.customer_details?.name || 'New Agency';
    const adminEmail = session.metadata.admin_email || session.customer_details?.email;
    const planId = session.metadata.plan_id || 'professional';
    
    // Generate unique agency ID
    const agencyId = `AGENCY_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    try {
      // Create agency record
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          agency_id: agencyId,
          agency_name: agencyName,
          contact_email: adminEmail,
          is_active: true,
          subscription_tier: planId,
          stripe_customer_id: session.customer,
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (agencyError) {
        console.error('Failed to create agency from checkout:', agencyError);
        return;
      }

      console.log(`Created agency ${agencyId} from checkout session ${session.id}`);

      // Update subscription metadata with agency_id for future webhooks
      await stripe.subscriptions.update(subscription.id, {
        metadata: {
          ...subscription.metadata,
          agency_id: agencyId,
        }
      });

    } catch (error) {
      console.error('Error processing checkout completion:', error);
    }
  }
}

// Disable body parsing to get raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
}