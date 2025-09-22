// Test script to verify webhook fixes with real Convoso data
const realConvosoData = {
  "id": "10256299",
  "created_at": "2025-09-05 19:04:14",
  "modified_at": "2025-09-14 19:40:04",
  "first_name": "Raji",
  "last_name": "Swamy",
  "email": "rrswamy22@gmail.com",
  "status": "SALE",
  "user_id": "1110461",
  "phone_number": "2678351744",
  "address1": "504 Wadsworth Ave",
  "city": "PHILADELPHIA",
  "state": "PA",
  "postal_code": "19119",
  "gender": "Female",
  "date_of_birth": "1970-10-04",
  "campaign_name": "PHS Dialer",
  "campaign_uid": "pi6tmzdo4w6zimzxtghwxecspm7mx2wd",
  "field_1": "96AAC4F3B5F8FC99707A5A0582C130",
  "field_2": "FAMILY",
  "field_3": "YES",
  "field_4": "better cov and rates",
  "field_29": "Cobra Keystone Health info",
  "called_count": "37"
};

// Load the normalization function
const fs = require('fs');
const webhookCode = fs.readFileSync('./api/leads/convoso-webhook/[agency].js', 'utf8');

// Extract the functions we need to test
const extractCustomFieldsMatch = webhookCode.match(/function extractCustomFields\(leadData\) \{[\s\S]*?\n\}/);
const normalizeLeadDataMatch = webhookCode.match(/function normalizeLeadData\(webhookData, agencyId\) \{[\s\S]*?return normalized;\s*\}/);

if (!extractCustomFieldsMatch || !normalizeLeadDataMatch) {
  console.error('Could not extract functions from webhook file');
  process.exit(1);
}

// Create a test environment
eval(extractCustomFieldsMatch[0]);
eval(normalizeLeadDataMatch[0]);

console.log('Testing webhook fixes with real Convoso data...\n');
console.log('========================================');
console.log('INPUT DATA (Sample from Convoso):');
console.log('========================================');
console.log(JSON.stringify(realConvosoData, null, 2));

console.log('\n========================================');
console.log('NORMALIZED OUTPUT:');
console.log('========================================');

try {
  const normalized = normalizeLeadData(realConvosoData, 'TEST_AGENCY');

  console.log('\nKey fields correctly mapped:');
  console.log('✓ address1:', normalized.address_line1 === '504 Wadsworth Ave' ? '✅ FIXED' : '❌ BROKEN');
  console.log('✓ status:', normalized.status === 'SALE' ? '✅ PRESERVED' : '❌ OVERWRITTEN');
  console.log('✓ custom_field_1:', normalized.custom_field_1 === realConvosoData.field_1 ? '✅ MAPPED' : '❌ MISSING');
  console.log('✓ custom_fields:', Object.keys(normalized.custom_fields || {}).length > 0 ? '✅ EXTRACTED' : '❌ MISSING');
  console.log('✓ called_count:', normalized.called_count === 37 ? '✅ CONVERTED' : '❌ MISSING');

  console.log('\nFull normalized data:');
  console.log(JSON.stringify(normalized, null, 2));

} catch (error) {
  console.error('Error during normalization:', error);
}

// Test PHS endpoint
console.log('\n========================================');
console.log('TESTING PHS ENDPOINT VALIDATION:');
console.log('========================================');

const phsCode = fs.readFileSync('./api/leads/convoso-phs.js', 'utf8');
const extractCustomFieldsPHSMatch = phsCode.match(/function extractCustomFields\(data\) \{[\s\S]*?\n\}/);

if (extractCustomFieldsPHSMatch) {
  eval(extractCustomFieldsPHSMatch[0]);

  // Simulate the validation logic
  const campaignUid = realConvosoData.campaign_uid;
  const campaignName = realConvosoData.campaign_name;

  const isValidCampaign =
    campaignUid === 'pi6tmzdo4w6zimzxtghwxecspm7mx2wd' ||
    campaignName === 'PHS Dialer';

  console.log('Campaign UID:', campaignUid);
  console.log('Campaign Name:', campaignName);
  console.log('Validation Result:', isValidCampaign ? '✅ ACCEPTED' : '❌ REJECTED');

  // Test custom fields extraction
  const customFields = extractCustomFields(realConvosoData);
  console.log('\nCustom fields extracted:', Object.keys(customFields).length, 'fields');
  console.log('Fields:', Object.keys(customFields).join(', '));
}

console.log('\n========================================');
console.log('TEST COMPLETE');
console.log('========================================');