import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestAgencies() {
  console.log('Creating test agencies with users...\n');

  const agencies = [
    {
      id: 'test-agency-001',
      name: 'Test Agency Alpha',
      status: 'active'
    },
    {
      id: 'test-agency-002',
      name: 'Test Agency Beta',
      status: 'active'
    }
  ];

  for (const agency of agencies) {
    console.log(`\n=== Creating ${agency.name} ===`);

    const { data: existingAgency } = await supabase
      .from('portal_agencies')
      .select('id')
      .eq('id', agency.id)
      .single();

    if (!existingAgency) {
      const { data: newAgency, error: agencyError } = await supabase
        .from('portal_agencies')
        .insert(agency)
        .select()
        .single();

      if (agencyError) {
        console.error(`❌ Error creating agency:`, agencyError);
        continue;
      }
      console.log(`✅ Created agency: ${agency.name}`);
    } else {
      console.log(`⚠️  Agency already exists: ${agency.name}`);
    }

    const password = 'Test123!';
    const passwordHash = await bcrypt.hash(password, 10);

    const agencyCode = agency.name.includes('Alpha') ? 'ALPHA' : 'BETA';
    const adminEmail = agency.name.includes('Alpha') ? 'admin@testalpha.com' : 'admin@testbeta.com';

    const users = [
      {
        email: adminEmail,
        password_hash: passwordHash,
        role: 'admin',
        name: `${agency.name} Admin`,
        agency_id: agency.id,
        is_active: true,
        roles: ['admin']
      },
      {
        email: adminEmail.replace('admin@', 'agent1@'),
        password_hash: passwordHash,
        role: 'agent',
        name: `${agency.name} Agent 1`,
        agency_id: agency.id,
        is_active: true,
        roles: ['agent'],
        agent_code: `${agencyCode}-001`
      },
      {
        email: adminEmail.replace('admin@', 'agent2@'),
        password_hash: passwordHash,
        role: 'agent',
        name: `${agency.name} Agent 2`,
        agency_id: agency.id,
        is_active: true,
        roles: ['agent'],
        agent_code: `${agencyCode}-002`
      }
    ];

    for (const user of users) {
      const { data: existingUser } = await supabase
        .from('portal_users')
        .select('id, email')
        .eq('email', user.email)
        .single();

      if (existingUser) {
        console.log(`  ⚠️  User already exists: ${user.email}`);
        continue;
      }

      const { data: newUser, error: userError } = await supabase
        .from('portal_users')
        .insert(user)
        .select()
        .single();

      if (userError) {
        console.error(`  ❌ Error creating user ${user.email}:`, userError.message);
        continue;
      }

      console.log(`  ✅ Created user: ${user.email} (${user.role})`);

      if (user.role === 'agent') {
        const agentRecord = {
          id: `AGENT-${agency.code}-${user.agent_code}`,
          user_id: newUser.id,
          agency_id: agency.id,
          email: user.email,
          name: user.name,
          commission_rate: 30,
          status: 'active'
        };

        const { error: agentError } = await supabase
          .from('portal_agents')
          .insert(agentRecord);

        if (agentError) {
          console.error(`    ❌ Error creating portal_agents record:`, agentError.message);
        } else {
          console.log(`    ✅ Created portal_agents record: ${agentRecord.id}`);
        }
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('TEST AGENCIES CREATED');
  console.log('='.repeat(80));
  console.log('\nLOGIN CREDENTIALS (password for all: Test123!)\n');

  console.log('Test Agency Alpha:');
  console.log('  Admin:   admin@testalpha.com   / Test123!');
  console.log('  Agent 1: agent1@testalpha.com  / Test123!');
  console.log('  Agent 2: agent2@testalpha.com  / Test123!');

  console.log('\nTest Agency Beta:');
  console.log('  Admin:   admin@testbeta.com    / Test123!');
  console.log('  Agent 1: agent1@testbeta.com   / Test123!');
  console.log('  Agent 2: agent2@testbeta.com   / Test123!');

  console.log('\n' + '='.repeat(80));
}

createTestAgencies().catch(console.error);