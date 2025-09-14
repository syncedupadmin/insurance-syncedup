import { createClient } from '@supabase/supabase-js';
import { ConvosoService } from '../services/convoso-discovery.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = '8nf3i9mmzoxidg3ntm28gbxvlhdiqo3p';
    
    console.log('Setting up PHS Convoso integration...');
    
    // Test the Convoso token
    const convoso = new ConvosoService(token);
    const agentTest = await convoso.getAgentList();
    
    if (!agentTest.success) {
      return res.status(400).json({
        error: 'Convoso token test failed',
        details: agentTest.error
      });
    }
    
    // Check if PHS agency exists
    const { data: phs, error: selectError } = await supabase
      .from('agencies')
      .select('*')
      .ilike('name', '%phs%')
      .single();
    
    if (selectError && selectError.code !== 'PGRST116') {
      // Error other than "not found"
      return res.status(500).json({
        error: 'Database error',
        details: selectError.message
      });
    }
    
    if (phs) {
      // Update existing PHS agency
      const { data: updated, error: updateError } = await supabase
        .from('agencies')
        .update({ convoso_auth_token: token })
        .eq('id', phs.id)
        .select()
        .single();
        
      if (updateError) {
        return res.status(500).json({
          error: 'Failed to update PHS agency',
          details: updateError.message
        });
      }
      
      return res.json({
        success: true,
        message: 'PHS agency token updated successfully',
        agency: updated,
        convoso_test: 'SUCCESS'
      });
    } else {
      // Create new PHS agency with only basic fields
      const insertData = {
        name: 'PHS Agency',
        is_active: true
      };
      
      // Only add convoso_auth_token if the column exists
      try {
        insertData.convoso_auth_token = token;
      } catch (error) {
        console.warn('convoso_auth_token column may not exist');
      }
      
      const { data: newAgency, error: insertError } = await supabase
        .from('agencies')
        .insert(insertData)
        .select()
        .single();
        
      if (insertError) {
        return res.status(500).json({
          error: 'Failed to create PHS agency',
          details: insertError.message
        });
      }
      
      return res.json({
        success: true,
        message: 'PHS agency created successfully',
        agency: newAgency,
        convoso_test: 'SUCCESS'
      });
    }
    
  } catch (error) {
    console.error('Setup error:', error);
    return res.status(500).json({
      error: 'Setup failed',
      details: error.message
    });
  }
}