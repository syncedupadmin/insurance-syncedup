import { createClient } from '@supabase/supabase-js';
import { ConvosoService } from '../api/services/convoso-discovery.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupPHSConvoso() {
  const token = '8nf3i9mmzoxidg3ntm28gbxvlhdiqo3p';
  
  console.log('Setting up PHS Convoso integration...');
  
  try {
    // Test the Convoso token first
    const convoso = new ConvosoService(token);
    const agentTest = await convoso.getAgentList();
    
    console.log('Convoso token test result:', agentTest.success ? 'SUCCESS' : 'FAILED');
    if (!agentTest.success) {
      console.error('Token error:', agentTest.error);
      return;
    }
    
    // Check current agencies table structure
    console.log('Checking agencies table...');
    const { data: existingAgencies, error: selectError } = await supabase
      .from('agencies')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.error('Agencies table error:', selectError);
      
      // Try to create a simple agencies table
      console.log('Creating basic agencies table...');
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS agencies (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT UNIQUE NOT NULL,
          convoso_auth_token TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `;
      
      // Note: We can't execute raw SQL from here, but we can show what needs to be run
      console.log('Please run this SQL in your Supabase SQL editor:');
      console.log(createTableSQL);
      return;
    }
    
    // Check if PHS agency exists
    const { data: phs } = await supabase
      .from('agencies')
      .select('*')
      .ilike('name', '%phs%')
      .single();
    
    if (phs) {
      console.log('PHS agency found, updating token...');
      const { error: updateError } = await supabase
        .from('agencies')
        .update({ convoso_auth_token: token })
        .eq('id', phs.id);
        
      if (updateError) {
        console.error('Update error:', updateError);
      } else {
        console.log('PHS agency token updated successfully!');
      }
    } else {
      console.log('Creating PHS agency...');
      const { data: newAgency, error: insertError } = await supabase
        .from('agencies')
        .insert({
          name: 'PHS Agency',
          convoso_auth_token: token,
          is_active: true
        })
        .select()
        .single();
        
      if (insertError) {
        console.error('Insert error:', insertError);
      } else {
        console.log('PHS agency created successfully!', newAgency);
      }
    }
    
  } catch (error) {
    console.error('Setup error:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupPHSConvoso();
}

export default setupPHSConvoso;