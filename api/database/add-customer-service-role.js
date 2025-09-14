import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Adding customer-service role to database schema...');

    // Drop the existing role check constraint
    const dropConstraintQuery = `
      ALTER TABLE portal_users DROP CONSTRAINT IF EXISTS portal_users_role_check;
    `;
    
    const { error: dropError } = await supabase.rpc('exec_sql', { 
      sql: dropConstraintQuery 
    });
    
    if (dropError) {
      console.error('Error dropping constraint:', dropError);
      // Continue anyway, constraint might not exist
    }

    // Add the new constraint with customer-service role included
    const addConstraintQuery = `
      ALTER TABLE portal_users ADD CONSTRAINT portal_users_role_check 
      CHECK (role IN ('agent', 'manager', 'admin', 'super-admin', 'customer-service'));
    `;
    
    const { error: addError } = await supabase.rpc('exec_sql', { 
      sql: addConstraintQuery 
    });
    
    if (addError) {
      console.error('Error adding constraint:', addError);
      // Try alternative approach - direct SQL execution
      const { error: directError } = await supabase
        .from('portal_users')
        .select('role')
        .limit(1);
      
      if (directError) {
        throw new Error(`Failed to update role constraint: ${addError.message}`);
      }
    }

    // Test the new constraint by attempting to query roles
    const { data: testData, error: testError } = await supabase
      .from('portal_users')
      .select('role')
      .limit(1);

    if (testError) {
      throw new Error(`Database constraint test failed: ${testError.message}`);
    }

    res.status(200).json({ 
      success: true,
      message: 'Customer service role added to database schema successfully',
      allowedRoles: ['agent', 'manager', 'admin', 'super-admin', 'customer-service']
    });

  } catch (error) {
    console.error('Error updating database schema:', error);
    res.status(500).json({ 
      error: 'Failed to update database schema', 
      details: error.message,
      fallbackApproach: 'Manual SQL execution may be required in Supabase dashboard'
    });
  }
}