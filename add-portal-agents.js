import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addPortalAgents() {
  const { data: agentUsers, error } = await supabase
    .from('portal_users')
    .select('id, email, name, agency_id, agent_code')
    .eq('role', 'agent')
    .in('email', [
      'agent1@testalpha.com',
      'agent2@testalpha.com',
      'agent1@testbeta.com',
      'agent2@testbeta.com'
    ]);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${agentUsers.length} agent users\n`);

  for (const user of agentUsers) {
    const { data: existing } = await supabase
      .from('portal_agents')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      console.log(`⚠️  Agent record already exists for ${user.email}`);
      continue;
    }

    const agentCode = user.agent_code || `AGENT-${Date.now()}`;

    const agentRecord = {
      id: agentCode,
      user_id: user.id,
      agency_id: user.agency_id,
      email: user.email,
      name: user.name,
      commission_rate: 30,
      status: 'active'
    };

    const { data: newAgent, error: agentError } = await supabase
      .from('portal_agents')
      .insert(agentRecord)
      .select()
      .single();

    if (agentError) {
      console.error(`❌ Error creating agent ${user.email}:`, agentError.message);
    } else {
      console.log(`✅ Created portal_agents record: ${agentCode} (${user.email})`);
    }
  }

  console.log('\n✅ Portal agents setup complete');
}

addPortalAgents();