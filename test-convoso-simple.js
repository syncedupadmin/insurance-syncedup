// Simple direct test of Convoso API without Supabase
const PHS_TOKEN = '8nf3i9mmzoxidg3ntm28gbxvlhdiqo3p';
const BASE_URL = 'https://api.convoso.com/v1';

async function testConvosoAPI() {
  console.log('🧪 Testing PHS Convoso Token Direct API...');
  
  try {
    // Test 1: Get campaigns
    console.log('📋 Fetching campaigns...');
    const campaignResponse = await fetch(`${BASE_URL}/campaigns/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 
        auth_token: PHS_TOKEN,
        limit: 100 
      })
    });
    
    if (!campaignResponse.ok) {
      console.log('❌ Campaign fetch failed - HTTP', campaignResponse.status);
      return;
    }
    
    const campaigns = await campaignResponse.json();
    console.log('Campaigns result:', campaigns);
    
    if (campaigns.success) {
      console.log(`✅ Found ${campaigns.data?.length || 0} campaigns`);
      if (campaigns.data && campaigns.data.length > 0) {
        console.log('Sample campaign:', {
          id: campaigns.data[0].id,
          name: campaigns.data[0].name,
          status: campaigns.data[0].status
        });
      }
    } else {
      console.log('❌ Campaign fetch failed:', campaigns.message);
      return;
    }
    
    // Test 2: Get lists
    console.log('📝 Fetching lists...');
    const listsResponse = await fetch(`${BASE_URL}/lists/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 
        auth_token: PHS_TOKEN,
        limit: 1000
      })
    });
    
    if (!listsResponse.ok) {
      console.log('❌ Lists fetch failed - HTTP', listsResponse.status);
      return;
    }
    
    const lists = await listsResponse.json();
    console.log('Lists result:', lists);
    
    if (lists.success) {
      console.log(`✅ Found ${lists.data?.length || 0} lists`);
      if (lists.data && lists.data.length > 0) {
        console.log('Sample lists:');
        lists.data.slice(0, 3).forEach(list => {
          console.log(`  - ${list.name} (ID: ${list.id}, Status: ${list.status})`);
        });
        
        // Find a suitable list for testing
        const activeList = lists.data.find(l => l.status === 'Active') || lists.data[0];
        console.log(`Using list for test: ${activeList.name} (ID: ${activeList.id})`);
        
        // Test 3: Try inserting a test lead
        console.log('🚀 Testing lead insertion...');
        const insertResponse = await fetch(`${BASE_URL}/leads/insert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            auth_token: PHS_TOKEN,
            list_id: activeList.id,
            phone_number: '8185551234',
            first_name: 'Test',
            last_name: 'Lead',
            email: 'test@example.com',
            hopper: 'true',
            hopper_priority: '99',
            check_dup: '2',
            update_if_found: 'true'
          })
        });
        
        const insertResult = await insertResponse.json();
        console.log('Insert result:', insertResult);
        
        if (insertResult.success) {
          console.log('✅ Lead inserted successfully!');
          console.log('Lead ID:', insertResult.data?.lead_id);
        } else {
          console.log('⚠️  Lead insertion result:', insertResult.message);
          // This might be expected (duplicate, etc.)
        }
      }
    } else {
      console.log('❌ Lists fetch failed:', lists.message);
    }
    
    console.log('\n🎉 PHS Token Test Complete!');
    console.log('✅ Token is valid and working');
    
  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
}

testConvosoAPI();