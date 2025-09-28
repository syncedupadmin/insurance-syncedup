require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function addConvosoCredentials() {
  console.log('🔐 ADDING CONVOSO API CREDENTIALS\n');
  console.log('═'.repeat(80) + '\n');

  // List agencies
  const { data: agencies, error: agenciesError } = await supabase
    .from('agencies')
    .select('id, name, code, api_credentials')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (agenciesError || !agencies || agencies.length === 0) {
    console.log('❌ No agencies found');
    rl.close();
    return;
  }

  console.log('📋 Available Agencies:\n');
  agencies.forEach((agency, idx) => {
    const hasConvoso = agency.api_credentials?.convoso ? '✅ Has Convoso' : '⚪ No Convoso';
    console.log(`${idx + 1}. ${agency.name} (${agency.code}) - ${hasConvoso}`);
    console.log(`   ID: ${agency.id}\n`);
  });

  const agencyChoice = await question('Enter agency number (or Q to quit): ');

  if (agencyChoice.toLowerCase() === 'q') {
    console.log('Cancelled');
    rl.close();
    return;
  }

  const selectedAgency = agencies[parseInt(agencyChoice) - 1];

  if (!selectedAgency) {
    console.log('❌ Invalid selection');
    rl.close();
    return;
  }

  console.log(`\n✅ Selected: ${selectedAgency.name}\n`);
  console.log('─'.repeat(80) + '\n');

  // Check if already has Convoso credentials
  if (selectedAgency.api_credentials?.convoso) {
    console.log('⚠️  This agency already has Convoso credentials:');
    console.log(JSON.stringify(selectedAgency.api_credentials.convoso, null, 2));
    console.log('');

    const overwrite = await question('Overwrite? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Cancelled');
      rl.close();
      return;
    }
  }

  console.log('Enter Convoso API Credentials:\n');

  const apiKey = await question('API Key: ');
  const apiSecret = await question('API Secret (optional): ');
  const accountId = await question('Account ID (optional): ');
  const baseUrl = await question('Base URL (press enter for default https://api.convoso.com): ');

  console.log('\n' + '─'.repeat(80));
  console.log('📝 Summary:\n');
  console.log(`Agency: ${selectedAgency.name}`);
  console.log(`API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`API Secret: ${apiSecret ? apiSecret.substring(0, 10) + '...' : '(none)'}`);
  console.log(`Account ID: ${accountId || '(none)'}`);
  console.log(`Base URL: ${baseUrl || 'https://api.convoso.com'}`);
  console.log('');

  const confirm = await question('Save these credentials? (y/n): ');

  if (confirm.toLowerCase() !== 'y') {
    console.log('Cancelled');
    rl.close();
    return;
  }

  // Build credentials object
  const existingCredentials = selectedAgency.api_credentials || {};
  const newCredentials = {
    ...existingCredentials,
    convoso: {
      api_key: apiKey,
      ...(apiSecret && { api_secret: apiSecret }),
      ...(accountId && { account_id: accountId }),
      base_url: baseUrl || 'https://api.convoso.com',
      enabled: true,
      created_at: new Date().toISOString()
    }
  };

  // Update database
  const { data, error } = await supabase
    .from('agencies')
    .update({ api_credentials: newCredentials })
    .eq('id', selectedAgency.id)
    .select()
    .single();

  if (error) {
    console.log('\n❌ Error saving credentials:', error.message);
    rl.close();
    return;
  }

  console.log('\n✅ CONVOSO CREDENTIALS SAVED SUCCESSFULLY!\n');
  console.log('Updated api_credentials:');
  console.log(JSON.stringify(data.api_credentials, null, 2));
  console.log('\n' + '═'.repeat(80));
  console.log('\n💡 Next Steps:');
  console.log('   1. Test the connection in the admin portal');
  console.log('   2. Configure Convoso integration settings');
  console.log('   3. Set up webhook endpoints if needed\n');

  rl.close();
}

addConvosoCredentials().catch(err => {
  console.error('Error:', err);
  rl.close();
  process.exit(1);
});