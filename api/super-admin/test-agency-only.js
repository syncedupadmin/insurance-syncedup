import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('Testing agency creation only...');

    // Generate agency code from name
    const agencyCode = 'TESTLLC' + Math.floor(Math.random() * 100).toString().padStart(2, '0');

    // Try to create just an agency
    const { data: newAgency, error: agencyError } = await supabase
      .from('agencies')
      .insert([{
        name: 'Test LLC Debug',
        code: agencyCode,
        admin_email: 'test@testllc.com',
        is_active: true
      }])
      .select('*')
      .single();

    if (agencyError) {
      console.error('Agency creation error:', agencyError);
      return res.status(500).json({ 
        success: false, 
        error: 'Agency creation failed: ' + agencyError.message,
        details: agencyError
      });
    }

    console.log('Agency created successfully:', newAgency.id);

    // Test both portal_users and users tables
    const tempPassword = 'TempPass123!';
    const password_hash = await bcrypt.hash(tempPassword, 10);
    
    // Test portal_users first
    const { data: testUser1, error: userError1 } = await supabase
      .from('portal_users')
      .insert({
        email: 'admin@testllc.com',
        password_hash: password_hash,
        name: 'Test Admin',
        role: 'admin',
        agency_id: newAgency.id,
        is_active: true,
        must_change_password: true
      })
      .select()
      .single();
    
    let portal_users_result = testUser1 ? 'SUCCESS' : (userError1 ? 'FAILED: ' + userError1.message : 'UNKNOWN');
    
    // Test users table
    const { data: testUser2, error: userError2 } = await supabase
      .from('users')
      .insert({
        email: 'admin2@testllc.com',
        password_hash: password_hash,
        name: 'Test Admin 2',
        role: 'admin',
        agency_id: newAgency.id,
        is_active: true,
        must_change_password: true
      })
      .select()
      .single();
    
    let users_result = testUser2 ? 'SUCCESS' : (userError2 ? 'FAILED: ' + userError2.message : 'UNKNOWN');

    // Clean up any created users
    if (testUser1) {
      await supabase.from('portal_users').delete().eq('id', testUser1.id);
    }
    if (testUser2) {
      await supabase.from('users').delete().eq('id', testUser2.id);
    }

    // Clean up agency
    await supabase.from('agencies').delete().eq('id', newAgency.id);

    return res.status(200).json({
      success: true,
      test_results: {
        agency_creation: 'SUCCESS',
        portal_users_table: portal_users_result,
        users_table: users_result,
        agency_id: newAgency.id
      }
    });

  } catch (error) {
    console.error('Test error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Test failed: ' + error.message 
    });
  }
}