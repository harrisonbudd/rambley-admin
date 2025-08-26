/**
 * Test script for both data types on the enhanced webhook endpoint
 * Run this to test the webhook with guest_message and message_log data
 */

const webhookUrl = 'http://localhost:3000/api/webhook/google-sheets-messages';
const apiKey = 'rambley_staging_wh_k3y_2024_a7f9c2e1d8b6';

// Test guest_message data type
const testGuestMessage = async () => {
  console.log('🧪 Testing guest_message data type...');
  
  const guestMessageData = {
    data_type: 'guest_message',
    account_id: 1,
    property_id: 'PROP-001',
    booking_id: 'BOOKING-12345',
    guest_message: 'Hello, I have a question about my check-in time tomorrow.',
    property_details_json: '{"name": "Mountain View Resort", "address": "123 Resort Way"}',
    booking_details_json: '{"checkin": "2024-01-15", "checkout": "2024-01-20", "guests": 2}',
    property_faqs_json: '[{"question": "What is check-in time?", "answer": "3:00 PM"}]',
    escalation_risk_indicators: 'Low', 
    available_knowledge: 'Yes',
    sub_category: 'Check-in Questions',
    raw_data: {
      sheet_name: 'aiResponse',
      row_number: 15,
      timestamp: new Date().toISOString()
    }
  };
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(guestMessageData)
    });
    
    const responseText = await response.text();
    console.log(`Guest Message Response (${response.status}):`, responseText);
    
    if (response.ok) {
      console.log('✅ Guest message test successful!');
      return true;
    } else {
      console.log('❌ Guest message test failed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Guest message test error:', error.message);
    return false;
  }
};

// Test message_log data type
const testMessageLog = async () => {
  console.log('\n🧪 Testing message_log data type...');
  
  const messageLogData = {
    data_type: 'message_log',
    account_id: 1,
    message_uuid: 'SM' + Math.random().toString(36).substr(2, 32),
    timestamp: new Date().toISOString(),
    from_number: '+1234567890',
    to_number: '+0987654321',
    message_body: 'Thank you for your inquiry! Check-in time is 3:00 PM. We look forward to your arrival.',
    image_url: '',
    message_type: 'Outbound',
    reference_message_uuids: 'MSG-001,MSG-002',
    reference_task_uuids: 'TASK-123',
    booking_id: 'BOOKING-12345',
    ai_enrichment_uuid: 'ENRICH-456',
    raw_data: {
      sheet_name: 'd:messageLog',
      timestamp: new Date().toISOString(),
      twilio_sid: 'SM1234567890abcdef'
    }
  };
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(messageLogData)
    });
    
    const responseText = await response.text();
    console.log(`Message Log Response (${response.status}):`, responseText);
    
    if (response.ok) {
      console.log('✅ Message log test successful!');
      return true;
    } else {
      console.log('❌ Message log test failed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Message log test error:', error.message);
    return false;
  }
};

// Test webhook status endpoint
const testWebhookStatus = async () => {
  console.log('\n🧪 Testing webhook status endpoint...');
  
  try {
    const response = await fetch(webhookUrl.replace('/google-sheets-messages', '/status'), {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey
      }
    });
    
    const responseText = await response.text();
    console.log(`Status Response (${response.status}):`, responseText);
    
    if (response.ok) {
      console.log('✅ Status endpoint working!');
      return true;
    } else {
      console.log('❌ Status endpoint failed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Status test error:', error.message);
    return false;
  }
};

// Test invalid data_type
const testInvalidDataType = async () => {
  console.log('\n🧪 Testing invalid data_type...');
  
  const invalidData = {
    data_type: 'invalid_type',
    account_id: 1,
    some_field: 'test'
  };
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(invalidData)
    });
    
    const responseText = await response.text();
    console.log(`Invalid Type Response (${response.status}):`, responseText);
    
    if (response.status === 400) {
      console.log('✅ Invalid data_type properly rejected!');
      return true;
    } else {
      console.log('❌ Invalid data_type should return 400 error');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Invalid type test error:', error.message);
    return false;
  }
};

// Run all tests
const runAllTests = async () => {
  console.log('🚀 Starting webhook tests for both data types...\n');
  
  const results = [];
  
  results.push(await testWebhookStatus());
  results.push(await testGuestMessage());
  results.push(await testMessageLog());
  results.push(await testInvalidDataType());
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n🏁 Test Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Both data types working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the output above.');
  }
};

// Export for use or run directly
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testGuestMessage, testMessageLog, testWebhookStatus, testInvalidDataType };
} else {
  // Run tests if called directly
  runAllTests().catch(console.error);
}