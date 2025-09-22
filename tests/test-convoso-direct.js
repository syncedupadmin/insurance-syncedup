// Direct test of Convoso integration without Next.js server
import { ConvosoService } from './api/services/convoso-discovery.js';

const PHS_TOKEN = '8nf3i9mmzoxidg3ntm28gbxvlhdiqo3p';

async function testPHSToken() {
  console.log('🧪 Testing PHS Convoso Token...');
  
  try {
    const convoso = new ConvosoService(PHS_TOKEN);
    
    // Test 1: Get campaigns
    console.log('📋 Fetching campaigns...');
    const campaigns = await convoso.getCampaigns();
    console.log('Campaigns result:', campaigns);
    
    if (campaigns.success) {
      console.log(`✅ Found ${campaigns.data?.length || 0} campaigns`);
      if (campaigns.data && campaigns.data.length > 0) {
        console.log('First campaign:', campaigns.data[0]);
      }
    } else {
      console.log('❌ Campaign fetch failed:', campaigns.error);
      return;
    }
    
    // Test 2: Get lists
    console.log('📝 Fetching lists...');
    const lists = await convoso.getLists();
    console.log('Lists result:', lists);
    
    if (lists.success) {
      console.log(`✅ Found ${lists.data?.length || 0} lists`);
      if (lists.data && lists.data.length > 0) {
        console.log('First list:', lists.data[0]);
        
        // Test 3: Try inserting a test lead
        console.log('🚀 Testing lead insertion...');
        const testLead = {
          list_id: lists.data[0].id,
          phone_number: '8185551234',
          first_name: 'Test',
          last_name: 'Lead',
          email: 'test@example.com'
        };
        
        const insertResult = await convoso.insertLead(testLead);
        console.log('Insert result:', insertResult);
        
        if (insertResult.success) {
          console.log('✅ Lead inserted successfully!');
          console.log('Lead ID:', insertResult.data?.lead_id);
        } else {
          console.log('⚠️  Lead insertion failed:', insertResult.message);
        }
      }
    } else {
      console.log('❌ Lists fetch failed:', lists.error);
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

testPHSToken();