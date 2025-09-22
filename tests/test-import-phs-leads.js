/**
 * Test script for PHS campaign lead import functionality
 * This script tests the import endpoint with sample data
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Test configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_DATA_DIR = './test-data';

async function testCSVImport() {
  console.log('\n=== Testing CSV Import for PHS Campaign ===\n');
  
  const form = new FormData();
  const csvPath = path.join(TEST_DATA_DIR, 'phs-campaign-leads.csv');
  
  // Check if file exists
  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV test file not found:', csvPath);
    return false;
  }
  
  // Append file and parameters
  form.append('file', fs.createReadStream(csvPath));
  form.append('agency_id', 'PHS-001');
  form.append('campaign_id', 'PHS-AUTO-2025');
  form.append('skip_duplicates', 'true');
  form.append('dry_run', 'true'); // Start with dry run
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/import-campaign-leads`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ CSV Dry Run Successful');
      console.log('Summary:', result.summary);
      
      if (result.errors && result.errors.length > 0) {
        console.log('\n⚠️ Validation Errors:');
        result.errors.forEach(err => {
          console.log(`  Row ${err.row}: ${err.error}`);
        });
      }
      
      if (result.duplicates && result.duplicates.length > 0) {
        console.log('\n⚠️ Duplicates Found:');
        result.duplicates.forEach(dup => {
          console.log(`  Row ${dup.row}: ${dup.phone}`);
        });
      }
      
      return true;
    } else {
      console.error('❌ CSV Import Failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Request Failed:', error.message);
    return false;
  }
}

async function testJSONImport() {
  console.log('\n=== Testing JSON Import for PHS Campaign ===\n');
  
  const form = new FormData();
  const jsonPath = path.join(TEST_DATA_DIR, 'phs-campaign-leads.json');
  
  // Check if file exists
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ JSON test file not found:', jsonPath);
    return false;
  }
  
  // Append file and parameters
  form.append('file', fs.createReadStream(jsonPath));
  form.append('agency_id', 'PHS-001');
  form.append('campaign_id', 'PHS-BUNDLE-2025');
  form.append('skip_duplicates', 'true');
  form.append('dry_run', 'true');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/import-campaign-leads`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ JSON Dry Run Successful');
      console.log('Summary:', result.summary);
      
      if (result.sample_data) {
        console.log('\n📋 Sample Processed Data:');
        console.log(JSON.stringify(result.sample_data[0], null, 2));
      }
      
      return true;
    } else {
      console.error('❌ JSON Import Failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Request Failed:', error.message);
    return false;
  }
}

async function testInvalidAgency() {
  console.log('\n=== Testing Invalid Agency Access ===\n');
  
  const form = new FormData();
  form.append('file', Buffer.from('test'), { filename: 'test.csv' });
  form.append('agency_id', 'INVALID-001');
  form.append('campaign_id', 'TEST');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/import-campaign-leads`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    const result = await response.json();
    
    if (response.status === 403) {
      console.log('✅ Correctly rejected invalid agency');
      console.log('Error:', result.message);
      return true;
    } else {
      console.error('❌ Should have rejected invalid agency');
      return false;
    }
  } catch (error) {
    console.error('❌ Request Failed:', error.message);
    return false;
  }
}

async function testActualImport() {
  console.log('\n=== Testing Actual Import (No Dry Run) ===\n');
  console.log('⚠️ This will actually import data to the database\n');
  
  const form = new FormData();
  const csvPath = path.join(TEST_DATA_DIR, 'phs-campaign-leads.csv');
  
  form.append('file', fs.createReadStream(csvPath));
  form.append('agency_id', 'PHS-001');
  form.append('campaign_id', 'PHS-AUTO-2025');
  form.append('skip_duplicates', 'true');
  form.append('dry_run', 'false'); // Actual import
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/import-campaign-leads`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Actual Import Successful');
      console.log('Campaign:', result.campaign);
      console.log('Summary:', result.summary);
      
      if (result.import_results) {
        console.log('\n📊 Import Results by Batch:');
        result.import_results.forEach(batch => {
          if (batch.success) {
            console.log(`  Batch ${batch.batch}: ✅ Imported ${batch.imported_count} leads`);
          } else {
            console.log(`  Batch ${batch.batch}: ❌ Failed - ${batch.error}`);
          }
        });
      }
      
      return true;
    } else {
      console.error('❌ Actual Import Failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Request Failed:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting PHS Campaign Lead Import Tests');
  console.log('=' .repeat(50));
  
  let allTestsPassed = true;
  
  // Test 1: CSV Import (Dry Run)
  if (!await testCSVImport()) {
    allTestsPassed = false;
  }
  
  // Test 2: JSON Import (Dry Run)
  if (!await testJSONImport()) {
    allTestsPassed = false;
  }
  
  // Test 3: Invalid Agency Access
  if (!await testInvalidAgency()) {
    allTestsPassed = false;
  }
  
  // Test 4: Actual Import (Optional - uncomment to run)
  // console.log('\n⚠️ Skipping actual import test (uncomment to enable)');
  // if (!await testActualImport()) {
  //   allTestsPassed = false;
  // }
  
  console.log('\n' + '=' .repeat(50));
  if (allTestsPassed) {
    console.log('✅ All tests passed successfully!');
  } else {
    console.log('❌ Some tests failed. Please review the output above.');
  }
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
  console.error('This script requires Node.js 18+ or the node-fetch package');
  console.log('Install: npm install node-fetch form-data');
  process.exit(1);
}

// Run tests
runTests().catch(console.error);