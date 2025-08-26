/**
 * Simple test script for the webhook endpoint
 * Run this to test if the webhook is working correctly
 */

const testWebhook = async () => {
  const webhookUrl = 'http://localhost:3000/api/webhook/google-sheets-messages';
  const apiKey = 'test-api-key'; // You'll need to set WEBHOOK_API_KEY env var to this value
  
  const testData = {
    account_id: 1,
    property_id: 'TEST-PROP-001',
    booking_id: 'TEST-BOOKING-123',
    guest_message: 'Hello, I have a question about my reservation.',
    property_details_json: '{"name": "Test Property", "address": "123 Test St"}',
    booking_details_json: '{"checkin": "2024-01-15", "checkout": "2024-01-20"}',
    property_faqs_json: '[{"question": "What is check-in time?", "answer": "3:00 PM"}]',
    escalation_risk_indicators: 'Low',
    available_knowledge: 'Yes',
    sub_category: 'General Inquiry',
    raw_data: {
      test: true,
      timestamp: new Date().toISOString()
    }
  };
  
  try {
    console.log('Testing webhook endpoint...');
    console.log('URL:', webhookUrl);
    console.log('Data:', JSON.stringify(testData, null, 2));
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(testData)
    });
    
    const responseText = await response.text();
    console.log(`Response Status: ${response.status}`);
    console.log('Response Body:', responseText);
    
    if (response.ok) {
      console.log('✅ Webhook test successful!');
    } else {
      console.log('❌ Webhook test failed');
    }
    
  } catch (error) {
    console.error('❌ Webhook test error:', error.message);
  }
};

// Test webhook status endpoint too
const testWebhookStatus = async () => {
  const statusUrl = 'http://localhost:3000/api/webhook/status';
  const apiKey = 'test-api-key';
  
  try {
    console.log('\nTesting webhook status endpoint...');
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey
      }
    });
    
    const responseText = await response.text();
    console.log(`Status Response: ${response.status}`);
    console.log('Status Body:', responseText);
    
  } catch (error) {
    console.error('Status test error:', error.message);
  }
};

// Run tests
console.log('🧪 Starting webhook tests...\n');

testWebhookStatus().then(() => {
  return testWebhook();
}).then(() => {
  console.log('\n🏁 Tests completed');
}).catch(error => {
  console.error('Test suite error:', error.message);
});