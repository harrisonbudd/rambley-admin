import pool from './config/database.js';
import jwt from 'jsonwebtoken';

const testMessagesAuth = async () => {
  try {
    console.log('🔍 Testing messages API authentication...');
    
    // Get user from database
    const client = await pool.connect();
    const userResult = await client.query('SELECT * FROM users LIMIT 1');
    
    if (userResult.rows.length === 0) {
      console.error('❌ No users found in database');
      process.exit(1);
    }
    
    const user = userResult.rows[0];
    console.log('✅ Found user:', user.email, 'Account ID:', user.account_id);
    
    // Check if we have message_log data
    const messageResult = await client.query('SELECT COUNT(*) as count FROM message_log WHERE account_id = $1', [user.account_id]);
    console.log('✅ Messages in database:', messageResult.rows[0].count);
    
    client.release();
    
    // Create a test JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        accountId: user.account_id,
        email: user.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log('✅ Generated JWT token');
    
    // Test the messages endpoint
    console.log('\n🧪 Testing /api/messages endpoint...');
    
    const response = await fetch('http://localhost:3000/api/messages', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.text();
    console.log('Response body:', data.substring(0, 500));
    
    if (response.ok) {
      const jsonData = JSON.parse(data);
      console.log('✅ Messages API working!');
      console.log('Conversations returned:', jsonData.data?.length || 0);
    } else {
      console.error('❌ Messages API failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
};

testMessagesAuth();