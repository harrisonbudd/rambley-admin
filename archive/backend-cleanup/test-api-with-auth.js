import axios from 'axios';

async function testMessagesAPI() {
  try {
    console.log('🔍 Testing Messages API with authentication...');
    
    // First, login to get a token
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@rambley.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Successfully logged in, got token');
    
    // Test the messages endpoint
    const messagesResponse = await axios.get('http://localhost:3000/api/messages', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📊 Messages API Response:');
    console.log('  Success:', messagesResponse.data.success);
    console.log('  Count:', messagesResponse.data.count);
    console.log('  Conversations:', messagesResponse.data.data.length);
    
    if (messagesResponse.data.data.length > 0) {
      console.log('\n✅ First conversation:');
      const firstConvo = messagesResponse.data.data[0];
      console.log('  ID:', firstConvo.id);
      console.log('  Guest Name:', firstConvo.guestName);
      console.log('  Phone:', firstConvo.phone);
      console.log('  Last Message:', firstConvo.lastMessage?.substring(0, 50) + '...');
      console.log('  Timestamp:', firstConvo.timestamp);
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.response?.data || error.message);
  }
}

testMessagesAPI();