// Test the production API endpoint directly
const testProductionAPI = async () => {
    try {
        console.log('🧪 Testing production agency API...');
        
        const API_BASE = 'https://insurance-syncedup-reowfb8jq-nicks-projects-f40381ea.vercel.app';
        
        // Test 1: Check if agencies API is accessible
        console.log('📡 Testing GET /api/super-admin/agencies');
        
        const response = await fetch(`${API_BASE}/api/super-admin/agencies`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer test-token',
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`Status: ${response.status}`);
        console.log(`Status Text: ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API Response:', data);
        } else {
            const error = await response.text();
            console.log('❌ API Error:', error);
        }
        
    } catch (error) {
        console.error('❌ Network Error:', error.message);
    }
};

console.log('Testing production deployment...');
testProductionAPI();