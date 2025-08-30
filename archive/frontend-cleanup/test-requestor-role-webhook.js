/**
 * Test script to verify the requestor_role field is working in the message log webhook
 * 
 * Usage:
 * 1. Make sure your backend server is running
 * 2. Set the correct WEBHOOK_URL and API_KEY below
 * 3. Run: node test-requestor-role-webhook.js
 */

const WEBHOOK_URL = 'https://empathetic-insight-staging.up.railway.app/api/webhook/google-sheets-messages'; // Railway staging URL
const API_KEY = 'rambley_staging_wh_k3y_2024_a7f9c2e1d8b6'; // Staging API key from RAILWAY-DEPLOYMENT.md
const ACCOUNT_ID = 1; // Account ID

async function testRequestorRoleWebhook() {
  const testPayload = {
    data_type: 'message_log',
    account_id: ACCOUNT_ID,
    message_uuid: 'SM' + Math.random().toString(36).substr(2, 32),
    timestamp: new Date().toISOString(),
    from_number: '+1234567890',
    to_number: '+0987654321',
    message_body: 'Test message with requestor role',
    message_type: 'Outbound',
    reference_message_uuids: 'MSG-001',
    reference_task_uuids: 'TASK-001',
    booking_id: 'BOOKING-TEST-123',
    requestor_role: 'Guest', // This is the new field we're testing
    ai_enrichment_uuid: 'ENRICH-001',
    raw_data: {
      test: true,
      timestamp: new Date().toISOString()
    }
  };

  console.log('🧪 Testing requestor_role webhook integration...');
  console.log('📤 Sending payload:', JSON.stringify(testPayload, null, 2));

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    const statusCode = response.status;

    console.log(`\n📥 Response status: ${statusCode}`);
    console.log('📥 Response body:', responseText);

    if (statusCode >= 200 && statusCode < 300) {
      console.log('\n✅ SUCCESS: requestor_role webhook test passed!');
      console.log('✅ The backend successfully processed the requestor_role field');
    } else {
      console.log('\n❌ FAILED: Webhook returned error status');
      console.log('❌ Check your webhook URL, API key, and backend logs');
    }

  } catch (error) {
    console.log('\n💥 ERROR: Failed to send webhook request');
    console.error('💥 Error details:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Make sure your backend server is running');
    console.log('   - Verify the WEBHOOK_URL is correct');
    console.log('   - Check your API_KEY is valid');
    console.log('   - Ensure your database has the requestor_role column');
  }
}

// Test with different requestor_role values
async function testMultipleRoles() {
  const roles = ['Guest', 'Host', 'Support', 'Admin', ''];
  
  console.log('\n🔄 Testing multiple requestor_role values...\n');
  
  for (const role of roles) {
    console.log(`Testing with requestor_role: "${role}"`);
    
    const testPayload = {
      data_type: 'message_log',
      account_id: ACCOUNT_ID,
      message_uuid: 'SM' + Math.random().toString(36).substr(2, 32),
      timestamp: new Date().toISOString(),
      from_number: '+1234567890',
      to_number: '+0987654321',
      message_body: `Test message with requestor_role: ${role || 'empty'}`,
      message_type: 'Outbound',
      requestor_role: role,
      ai_enrichment_uuid: 'ENRICH-' + Math.random().toString(36).substr(2, 8)
    };

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(testPayload)
      });

      const statusCode = response.status;
      if (statusCode >= 200 && statusCode < 300) {
        console.log(`  ✅ Success for role: "${role}"`);
      } else {
        console.log(`  ❌ Failed for role: "${role}" (status: ${statusCode})`);
      }
    } catch (error) {
      console.log(`  💥 Error for role: "${role}" - ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Run the tests
async function runAllTests() {
  console.log('🚀 Starting requestor_role webhook tests...\n');
  
  // Update these values before running
  if (WEBHOOK_URL.includes('your-staging-app.railway.app')) {
    console.log('❌ Please update the WEBHOOK_URL at the top of this file with your actual Railway staging URL');
    console.log('💡 You can find it in your Railway dashboard > staging environment > Settings > Domains');
    process.exit(1);
  }
  
  await testRequestorRoleWebhook();
  await testMultipleRoles();
  
  console.log('\n🎉 All tests completed!');
}

// Check if we have fetch available (Node 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ for fetch support');
  console.log('   Alternative: npm install node-fetch and uncomment the import below');
  // const fetch = require('node-fetch');
  process.exit(1);
}

runAllTests().catch(console.error);
