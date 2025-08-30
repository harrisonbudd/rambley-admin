// Simple API test script for contacts system
// Usage: node test-api.js <base_url> <auth_token>

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const AUTH_TOKEN = process.argv[3] || '';

if (!AUTH_TOKEN) {
  console.log('Usage: node test-api.js <base_url> <auth_token>');
  console.log('Example: node test-api.js https://your-app.railway.app eyJhbGciOiJIUzI1NiIs...');
  process.exit(1);
}

async function testEndpoint(method, endpoint, data = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    console.log(`🔍 Testing ${method} ${endpoint}`);
    const response = await fetch(url, options);
    const responseData = await response.text();
    
    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
    } catch {
      parsedData = responseData;
    }

    console.log(`   Status: ${response.status}`);
    if (response.status >= 200 && response.status < 300) {
      console.log(`   ✅ Success`);
      if (method === 'GET' && parsedData) {
        if (Array.isArray(parsedData)) {
          console.log(`   📊 Returned ${parsedData.length} items`);
        } else if (parsedData.contacts) {
          console.log(`   📊 Returned ${parsedData.contacts.length} contacts`);
        } else if (parsedData.properties) {
          console.log(`   📊 Returned ${parsedData.properties.length} properties`);
        }
      }
    } else {
      console.log(`   ❌ Error: ${JSON.stringify(parsedData, null, 2)}`);
    }
    console.log('');
    
    return { status: response.status, data: parsedData };
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
    console.log('');
    return { status: 0, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting API Tests');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🔑 Auth Token: ${AUTH_TOKEN.substring(0, 20)}...`);
  console.log('');

  // Test health endpoint
  await testEndpoint('GET', '/health');
  
  // Test properties endpoints
  console.log('📋 Testing Properties Endpoints:');
  const propertiesResult = await testEndpoint('GET', '/api/properties');
  
  // Create a test property
  const newProperty = {
    name: 'Test Property ' + Date.now(),
    address: 'Test Address',
    description: 'Test Description'
  };
  const createPropertyResult = await testEndpoint('POST', '/api/properties', newProperty);
  
  let propertyId = null;
  if (createPropertyResult.status === 201 && createPropertyResult.data.id) {
    propertyId = createPropertyResult.data.id;
    console.log(`   Created property with ID: ${propertyId}`);
    
    // Test get single property
    await testEndpoint('GET', `/api/properties/${propertyId}`);
    
    // Test update property
    const updateProperty = {
      ...newProperty,
      name: newProperty.name + ' (Updated)'
    };
    await testEndpoint('PUT', `/api/properties/${propertyId}`, updateProperty);
  }

  // Test contacts endpoints
  console.log('👥 Testing Contacts Endpoints:');
  await testEndpoint('GET', '/api/contacts');
  
  // Create a test contact
  const newContact = {
    name: 'Test Contact ' + Date.now(),
    service_type: 'Test Service',
    phone: '+1 (555) 123-4567',
    email: `test${Date.now()}@example.com`,
    preferred_language: 'en',
    notes: 'Test notes',
    serviceLocations: propertyId ? [propertyId] : []
  };
  const createContactResult = await testEndpoint('POST', '/api/contacts', newContact);
  
  let contactId = null;
  if (createContactResult.status === 201 && createContactResult.data.id) {
    contactId = createContactResult.data.id;
    console.log(`   Created contact with ID: ${contactId}`);
    
    // Test get single contact
    await testEndpoint('GET', `/api/contacts/${contactId}`);
    
    // Test update contact
    const updateContact = {
      ...newContact,
      name: newContact.name + ' (Updated)',
      email: `updated${Date.now()}@example.com`
    };
    await testEndpoint('PUT', `/api/contacts/${contactId}`, updateContact);
    
    // Test contacts by property
    if (propertyId) {
      await testEndpoint('GET', `/api/contacts/by-property/${propertyId}`);
    }
  }

  // Test filtering
  console.log('🔍 Testing Filtering:');
  await testEndpoint('GET', '/api/contacts?service_type=Test');
  await testEndpoint('GET', '/api/contacts?language=en');
  await testEndpoint('GET', '/api/contacts?search=Test');

  // Cleanup - delete test data
  console.log('🧹 Cleaning up test data:');
  if (contactId) {
    await testEndpoint('DELETE', `/api/contacts/${contactId}`);
  }
  if (propertyId) {
    await testEndpoint('DELETE', `/api/properties/${propertyId}`);
  }

  console.log('✅ API Tests Complete!');
}

// Add fetch if not available (Node.js < 18)
if (typeof fetch === 'undefined') {
  console.log('❌ fetch is not available. Please use Node.js 18+ or install node-fetch');
  process.exit(1);
}

runTests().catch(console.error); 