// Helper script to get authentication token for API testing
// Usage: node get-auth-token.js <base_url> <email> <password>

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const EMAIL = process.argv[3] || 'admin@rambley.com';
const PASSWORD = process.argv[4] || 'AdminPass123!';

if (!process.argv[2]) {
  console.log('Usage: node get-auth-token.js <base_url> [email] [password]');
  console.log('Example: node get-auth-token.js https://your-app.railway.app');
  console.log('Default credentials: admin@rambley.com / AdminPass123!');
  console.log('');
}

async function getAuthToken() {
  try {
    console.log('🔑 Getting authentication token...');
    console.log(`📍 Base URL: ${BASE_URL}`);
    console.log(`👤 Email: ${EMAIL}`);
    console.log('');

    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD
      })
    });

    const data = await response.json();

    if (response.status === 200 && data.accessToken) {
      console.log('✅ Login successful!');
      console.log('');
      console.log('🎟️  Access Token:');
      console.log(data.accessToken);
      console.log('');
      console.log('💡 Use this token for API testing:');
      console.log(`node test-api.js ${BASE_URL} ${data.accessToken}`);
      console.log('');
      
      // Test a simple authenticated endpoint
      console.log('🧪 Testing token with /api/properties...');
      const testResponse = await fetch(`${BASE_URL}/api/properties`, {
        headers: {
          'Authorization': `Bearer ${data.accessToken}`
        }
      });
      
      const testData = await testResponse.json();
      
      if (testResponse.status === 200) {
        console.log('✅ Token works! Properties endpoint accessible.');
        if (testData.properties) {
          console.log(`📊 Found ${testData.properties.length} properties in database`);
        }
      } else {
        console.log('❌ Token test failed:', testData);
      }
      
    } else {
      console.log('❌ Login failed:');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(data, null, 2));
      
      if (response.status === 401) {
        console.log('');
        console.log('💡 Try these solutions:');
        console.log('1. Check if the default admin user exists');
        console.log('2. Verify the database migration ran successfully');
        console.log('3. Check if credentials are correct');
      }
    }

  } catch (error) {
    console.log('❌ Network Error:', error.message);
    console.log('');
    console.log('💡 Common issues:');
    console.log('1. Server is not running');
    console.log('2. Wrong base URL');
    console.log('3. Network connectivity issues');
  }
}

// Add fetch if not available (Node.js < 18)
if (typeof fetch === 'undefined') {
  console.log('❌ fetch is not available. Please use Node.js 18+ or install node-fetch');
  process.exit(1);
}

getAuthToken().catch(console.error); 