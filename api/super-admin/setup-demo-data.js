import { requireAuth } from '../_middleware/authCheck.js';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

async function setupDemoDataHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = req.supabase || createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const results = {
      users_created: 0,
      leads_created: 0,
      tickets_created: 0,
      commissions_created: 0,
      errors: []
    };

    // Demo user accounts data
    const demoUsers = [
      {
        email: 'agent@demo.com',
        password: 'demo123!',
        name: 'Demo Agent',
        role: 'agent',
        phone: '555-AGENT-01',
        agency_id: 'DEMO001'
      },
      {
        email: 'manager@demo.com', 
        password: 'demo123!',
        name: 'Demo Manager',
        role: 'manager',
        phone: '555-MANAGER-01',
        agency_id: 'DEMO001'
      },
      {
        email: 'admin@demo.com',
        password: 'demo123!',
        name: 'Demo Admin',
        role: 'admin',
        phone: '555-ADMIN-01',
        agency_id: 'DEMO001'
      },
      {
        email: 'customerservice@demo.com',
        password: 'demo123!',
        name: 'Demo Support',
        role: 'customer_service',
        phone: '555-SUPPORT-01',
        agency_id: 'DEMO001'
      },
      {
        email: 'superadmin@demo.com',
        password: 'demo123!',
        name: 'Demo Super Admin',
        role: 'super_admin',
        phone: '555-SUPER-01',
        agency_id: 'DEMO001'
      }
    ];

    // 1. Create demo users
    for (const userData of demoUsers) {
      try {
        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('portal_users')
          .select('id')
          .eq('email', userData.email)
          .single();

        if (existingUser) {
          console.log(`User ${userData.email} already exists, skipping creation`);
          continue;
        }

        // Hash password
        const password_hash = await bcrypt.hash(userData.password, 10);

        // Create user
        const { data: newUser, error: userError } = await supabase
          .from('portal_users')
          .insert({
            email: userData.email,
            password_hash,
            name: userData.name,
            role: userData.role,
            phone: userData.phone,
            agency_id: userData.agency_id,
            is_active: true,
            must_change_password: false,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (userError) {
          results.errors.push(`Failed to create user ${userData.email}: ${userError.message}`);
        } else {
          results.users_created++;
          console.log(`Created demo user: ${userData.email}`);
        }
      } catch (error) {
        results.errors.push(`Error creating user ${userData.email}: ${error.message}`);
      }
    }

    // Get agent user ID for lead assignments
    const { data: agentUser } = await supabase
      .from('portal_users')
      .select('id')
      .eq('email', 'agent@demo.com')
      .single();

    const agentId = agentUser?.id;

    // 2. Create fake leads data
    const fakeLeads = [
      {
        lead_id: 'DEMO_LEAD_001',
        phone_number: '555-LEAD-001',
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@email.com',
        source: 'convoso',
        campaign_id: 'DEMO_CAMP_001',
        campaign_name: 'Auto Insurance Q4 Campaign',
        cost: 25.00,
        state: 'CA',
        city: 'Los Angeles',
        zip_code: '90210',
        age: 35,
        insurance_type: 'auto',
        current_carrier: 'State Farm',
        agent_assignment: agentId,
        status: 'contacted',
        priority: 'high',
        lead_score: 85,
        call_attempts: 2,
        last_call_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        notes: 'Interested in switching carriers. Current policy expires in 3 months.'
      },
      {
        lead_id: 'DEMO_LEAD_002', 
        phone_number: '555-LEAD-002',
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'sarah.johnson@email.com',
        source: 'convoso',
        campaign_id: 'DEMO_CAMP_002',
        campaign_name: 'Home Insurance Special',
        cost: 35.00,
        state: 'TX',
        city: 'Houston',
        zip_code: '77001',
        age: 42,
        insurance_type: 'home',
        current_carrier: 'Allstate',
        agent_assignment: agentId,
        status: 'new',
        priority: 'normal',
        lead_score: 75,
        call_attempts: 0,
        notes: 'New homeowner looking for comprehensive coverage.'
      },
      {
        lead_id: 'DEMO_LEAD_003',
        phone_number: '555-LEAD-003', 
        first_name: 'Michael',
        last_name: 'Brown',
        email: 'mike.brown@email.com',
        source: 'convoso',
        campaign_id: 'DEMO_CAMP_001',
        campaign_name: 'Auto Insurance Q4 Campaign',
        cost: 25.00,
        state: 'FL',
        city: 'Miami',
        zip_code: '33101',
        age: 28,
        insurance_type: 'auto',
        current_carrier: 'GEICO',
        agent_assignment: agentId,
        status: 'quoted',
        priority: 'high',
        lead_score: 90,
        call_attempts: 3,
        last_call_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
        notes: 'Quote provided. Follow up scheduled for tomorrow.'
      },
      {
        lead_id: 'DEMO_LEAD_004',
        phone_number: '555-LEAD-004',
        first_name: 'Emily',
        last_name: 'Davis',
        email: 'emily.davis@email.com',
        source: 'convoso',
        campaign_id: 'DEMO_CAMP_003',
        campaign_name: 'Life Insurance Leads',
        cost: 40.00,
        state: 'NY',
        city: 'New York',
        zip_code: '10001',
        age: 38,
        insurance_type: 'life',
        agent_assignment: agentId,
        status: 'sold',
        priority: 'normal',
        lead_score: 95,
        call_attempts: 4,
        last_call_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        notes: 'Converted! Purchased $500K life insurance policy.'
      },
      {
        lead_id: 'DEMO_LEAD_005',
        phone_number: '555-LEAD-005',
        first_name: 'Robert',
        last_name: 'Wilson',
        email: 'robert.wilson@email.com',
        source: 'convoso',
        campaign_id: 'DEMO_CAMP_002',
        campaign_name: 'Home Insurance Special',
        cost: 35.00,
        state: 'WA',
        city: 'Seattle',
        zip_code: '98101',
        age: 45,
        insurance_type: 'home',
        current_carrier: 'Progressive',
        agent_assignment: agentId,
        status: 'lost',
        priority: 'low',
        lead_score: 40,
        call_attempts: 5,
        last_call_time: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), // 3 days ago
        notes: 'Not interested. Current policy is sufficient.'
      }
    ];

    // Insert leads data
    for (const leadData of fakeLeads) {
      try {
        const { error: leadError } = await supabase
          .from('convoso_leads')
          .upsert(leadData, { onConflict: 'lead_id' });

        if (leadError) {
          results.errors.push(`Failed to create lead ${leadData.lead_id}: ${leadError.message}`);
        } else {
          results.leads_created++;
        }
      } catch (error) {
        results.errors.push(`Error creating lead ${leadData.lead_id}: ${error.message}`);
      }
    }

    // 3. Create fake support tickets
    const fakeSupportTickets = [
      {
        ticket_number: 'TKT-DEMO-001',
        title: 'Login Issues - Cannot Access Dashboard',
        description: 'Agent is unable to log into the system. Getting "Invalid credentials" error even with correct password.',
        priority: 'high',
        status: 'open',
        agency_id: 'DEMO001',
        created_by: agentId,
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() // 6 hours ago
      },
      {
        ticket_number: 'TKT-DEMO-002',
        title: 'Commission Calculation Error',
        description: 'Commission amounts showing incorrectly in the dashboard. Should be $1,200 but showing as $120.',
        priority: 'normal',
        status: 'in_progress',
        agency_id: 'DEMO001', 
        created_by: agentId,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      },
      {
        ticket_number: 'TKT-DEMO-003',
        title: 'Lead Assignment Not Working',
        description: 'New leads are not being automatically assigned to agents. They remain unassigned in the system.',
        priority: 'urgent',
        status: 'resolved',
        agency_id: 'DEMO001',
        created_by: agentId,
        created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
        resolved_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // 12 hours ago
      },
      {
        ticket_number: 'TKT-DEMO-004', 
        title: 'Report Export Feature Request',
        description: 'Would like ability to export monthly performance reports to Excel format for agency meetings.',
        priority: 'normal',
        status: 'open',
        agency_id: 'DEMO001',
        created_by: agentId,
        created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString() // 3 days ago
      }
    ];

    // Insert support tickets
    for (const ticketData of fakeSupportTickets) {
      try {
        const { error: ticketError } = await supabase
          .from('support_tickets')
          .upsert(ticketData, { onConflict: 'ticket_number' });

        if (ticketError) {
          results.errors.push(`Failed to create ticket ${ticketData.ticket_number}: ${ticketError.message}`);
        } else {
          results.tickets_created++;
        }
      } catch (error) {
        results.errors.push(`Error creating ticket ${ticketData.ticket_number}: ${error.message}`);
      }
    }

    // 4. Create fake commission data
    const fakeCommissions = [
      {
        sale_id: 'DEMO_SALE_001',
        agent_id: agentId,
        agency_id: 'DEMO001',
        commission_amount: 1200.00,
        status: 'paid',
        product_name: 'Auto Insurance Premium',
        premium_amount: 8400,
        customer_name: 'John Smith',
        customer_email: 'john.smith@email.com',
        sale_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
        payment_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
        commission_rate: 14.29, // 1200/8400 * 100
        policy_number: 'POL-DEMO-001',
        carrier: 'State Farm'
      },
      {
        sale_id: 'DEMO_SALE_002',
        agent_id: agentId,
        agency_id: 'DEMO001', 
        commission_amount: 850.50,
        status: 'pending',
        product_name: 'Home Insurance Policy',
        premium_amount: 5670,
        customer_name: 'Sarah Johnson',
        customer_email: 'sarah.johnson@email.com',
        sale_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        commission_rate: 15.0,
        policy_number: 'POL-DEMO-002',
        carrier: 'Allstate'
      },
      {
        sale_id: 'DEMO_SALE_003',
        agent_id: agentId,
        agency_id: 'DEMO001',
        commission_amount: 425.25,
        status: 'paid',
        product_name: 'Life Insurance Policy',
        premium_amount: 2835,
        customer_name: 'Michael Brown',
        customer_email: 'mike.brown@email.com',
        sale_date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), // 25 days ago
        payment_date: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString(), // 17 days ago
        commission_rate: 15.0,
        policy_number: 'POL-DEMO-003',
        carrier: 'MetLife'
      },
      {
        sale_id: 'DEMO_SALE_004',
        agent_id: agentId,
        agency_id: 'DEMO001',
        commission_amount: 750.00,
        status: 'paid',
        product_name: 'Auto + Home Bundle',
        premium_amount: 5000,
        customer_name: 'Emily Davis',
        customer_email: 'emily.davis@email.com',
        sale_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
        payment_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
        commission_rate: 15.0,
        policy_number: 'POL-DEMO-004',
        carrier: 'State Farm'
      },
      {
        sale_id: 'DEMO_SALE_005',
        agent_id: agentId,
        agency_id: 'DEMO001',
        commission_amount: 300.00,
        status: 'cancelled',
        product_name: 'Renters Insurance',
        premium_amount: 1200,
        customer_name: 'Robert Wilson',
        customer_email: 'robert.wilson@email.com',
        sale_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        commission_rate: 25.0,
        policy_number: 'POL-DEMO-005',
        carrier: 'GEICO',
        cancellation_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        cancellation_reason: 'Customer changed mind during cooling-off period'
      }
    ];

    // Insert commission data
    for (const commissionData of fakeCommissions) {
      try {
        const { error: commissionError } = await supabase
          .from('portal_commissions')
          .upsert(commissionData, { onConflict: 'sale_id' });

        if (commissionError) {
          results.errors.push(`Failed to create commission ${commissionData.sale_id}: ${commissionError.message}`);
        } else {
          results.commissions_created++;
        }
      } catch (error) {
        results.errors.push(`Error creating commission ${commissionData.sale_id}: ${error.message}`);
      }
    }

    return res.json({
      success: true,
      message: 'Demo data setup completed',
      results
    });

  } catch (error) {
    console.error('Demo setup error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default requireAuth(['super_admin'])(setupDemoDataHandler);