import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Extract authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Missing or invalid authorization header' });
    }

    // Verify admin access (you may want to decode and verify JWT here)
    const token = authHeader.substring(7);
    
    // Extract form data
    const { 
      name, 
      contact_email, 
      phone_number, 
      address, 
      plan_type 
    } = req.body;

    // Validate required fields
    if (!name || !contact_email || !plan_type) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: name, contact_email, plan_type' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact_email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }

    // Validate plan type
    const validPlans = ['basic', 'professional', 'enterprise'];
    if (!validPlans.includes(plan_type)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid plan type' 
      });
    }

    // Check if agency name already exists
    const { data: existingAgency } = await supabase
      .from('agencies')
      .select('id')
      .eq('name', name)
      .single();

    if (existingAgency) {
      return res.status(409).json({ 
        success: false, 
        error: 'An agency with this name already exists' 
      });
    }

    // Generate agency code from name
    const agencyCode = name.toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '') // Remove spaces
      .substring(0, 10) + Math.floor(Math.random() * 100).toString().padStart(2, '0');

    // Start transaction by creating agency first
    const { data: newAgency, error: agencyError } = await supabase
      .from('agencies')
      .insert([{
        name: name,
        code: agencyCode,
        admin_email: contact_email,
        is_active: true,
        settings: {
          plan: plan_type,
          billing: {
            monthly_cost: plan_type === 'basic' ? 99 : plan_type === 'professional' ? 199 : 399,
            status: 'active'
          },
          features: {
            max_users: plan_type === 'basic' ? 10 : plan_type === 'professional' ? 50 : 200,
            api_access: true,
            advanced_reporting: plan_type !== 'basic'
          },
          contact: {
            phone: phone_number,
            address: address
          }
        },
        features: {
          dashboard: true,
          reports: true,
          api_access: true,
          bulk_upload: plan_type !== 'basic'
        },
        commission_split: 20,
        pay_period: 'monthly',
        pay_day: 1,
        participate_global_leaderboard: true,
        is_demo: false,
        created_at: new Date().toISOString()
      }])
      .select('*')
      .single();

    if (agencyError) {
      console.error('Error creating agency:', agencyError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create agency: ' + agencyError.message 
      });
    }

    // Generate agency domain from name for email addresses
    const agencyDomain = name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '') // Remove spaces
      .substring(0, 20); // Limit length

    // Default password for all users
    const defaultPassword = 'TempPass123!';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10); // Use 10 rounds like existing API

    // Define the 5 default users to create
    const defaultUsers = [
      {
        role: 'admin',
        email: `admin@${agencyDomain}.com`,
        first_name: 'Agency',
        last_name: 'Admin'
      },
      {
        role: 'manager',
        email: `manager@${agencyDomain}.com`,
        first_name: 'Agency',
        last_name: 'Manager'
      },
      {
        role: 'agent',
        email: `agent@${agencyDomain}.com`,
        first_name: 'Agency',
        last_name: 'Agent'
      },
      {
        role: 'customer_service',
        email: `support@${agencyDomain}.com`,
        first_name: 'Customer',
        last_name: 'Service'
      },
      {
        role: 'support',
        email: `help@${agencyDomain}.com`,
        first_name: 'Technical',
        last_name: 'Support'
      }
    ];

    // Create all 5 users - using the users table (not portal_users)
    const userInsertPromises = defaultUsers.map(user => 
      supabase
        .from('users')
        .insert({
          email: user.email,
          password_hash: hashedPassword,
          name: `${user.first_name} ${user.last_name}`,
          role: user.role,
          agency_id: newAgency.id,
          is_active: true,
          must_change_password: true
        })
        .select()
        .single()
    );

    try {
      // Wait a bit to ensure agency is committed, then create users sequentially to avoid race conditions
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create users one by one instead of all at once to avoid constraint conflicts
      const userResults = [];
      for (let i = 0; i < defaultUsers.length; i++) {
        console.log(`Creating user ${i + 1}/5: ${defaultUsers[i].email}`);
        try {
          const result = await supabase
            .from('users')
            .insert({
              email: defaultUsers[i].email,
              password_hash: hashedPassword,
              name: `${defaultUsers[i].first_name} ${defaultUsers[i].last_name}`,
              role: defaultUsers[i].role,
              agency_id: newAgency.id,
              is_active: true,
              must_change_password: true
            })
            .select()
            .single();
            
          if (result.error) {
            console.error(`User ${i + 1} creation failed:`, result.error);
            throw new Error(`User creation failed for ${defaultUsers[i].email}: ` + result.error.message);
          }
          
          console.log(`User ${i + 1} created successfully:`, result.data.id);
          userResults.push(result);
        } catch (error) {
          console.error(`Error creating user ${i + 1}:`, error);
          throw error;
        }
      }
      
      // Check if any user creation failed
      const failedUsers = userResults.filter(result => result.error);
      if (failedUsers.length > 0) {
        // Rollback: delete the created agency
        await supabase
          .from('agencies')
          .delete()
          .eq('id', newAgency.id);

        console.error('User creation failed:', failedUsers);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to create default users. Agency creation rolled back.' 
        });
      }

      const createdUsers = userResults.map(result => result.data);

      // Success response
      return res.status(201).json({
        success: true,
        message: `Agency "${name}" created successfully with 5 default users`,
        data: {
          agency: {
            id: newAgency.id,
            name: newAgency.name,
            code: newAgency.code,
            admin_email: newAgency.admin_email,
            plan_type: newAgency.settings?.plan || 'basic',
            phone_number: newAgency.settings?.contact?.phone,
            address: newAgency.settings?.contact?.address,
            is_active: newAgency.is_active,
            created_at: newAgency.created_at
          },
          users: createdUsers.map(user => ({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          })),
          user_count: createdUsers.length,
          default_password: defaultPassword,
          password_note: 'Users must change password on first login'
        }
      });

    } catch (userError) {
      // Rollback: delete the created agency
      await supabase
        .from('agencies')
        .delete()
        .eq('id', newAgency.id);

      console.error('Error creating users:', userError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create default users. Agency creation rolled back.',
        detailed_error: userError.message,
        debug_info: {
          agency_id: newAgency.id,
          user_creation_attempt: true
        }
      });
    }

  } catch (error) {
    console.error('Error in create-agency:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
}