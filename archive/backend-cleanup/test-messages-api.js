import pkg from 'pg';
const { Pool } = pkg;

// Direct connection to Railway PostgreSQL
const pool = new Pool({
  connectionString: 'postgresql://postgres:HeQmqgFITpQIWDJFfQeHhtpJevWJTyDE@shortline.proxy.rlwy.net:15142/railway'
});

// Test the messages API logic directly with RLS context
async function testMessagesQuery() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing RLS context and messages query...');
    
    // Set RLS context (simulating authenticated user)
    await client.query('SELECT set_config($1, $2, true)', ['app.current_account_id', '1']);
    await client.query('SELECT set_config($1, $2, true)', ['app.current_user_id', '1']);
    
    console.log('✅ RLS context set: account_id=1, user_id=1');
    
    // Test the exact query from our API
    const conversationsQuery = `
      WITH latest_messages AS (
        SELECT DISTINCT ON (COALESCE(booking_id, 'no_booking_' || from_number || '_' || to_number))
          COALESCE(booking_id, 'no_booking_' || from_number || '_' || to_number) as conversation_id,
          booking_id,
          id,
          message_uuid,
          timestamp,
          from_number,
          to_number,
          message_body,
          message_type,
          requestor_role
        FROM message_log ml
        WHERE account_id = COALESCE(
          NULLIF(current_setting('app.current_account_id', true), '')::INTEGER,
          (SELECT account_id FROM users WHERE id = COALESCE(
            NULLIF(current_setting('app.current_user_id', true), '')::INTEGER,
            0
          ))
        )
        ORDER BY conversation_id, timestamp DESC
      )
      SELECT * FROM latest_messages
      ORDER BY timestamp DESC
      LIMIT 10
    `;
    
    const result = await client.query(conversationsQuery, []);
    
    console.log(`📊 Query returned ${result.rows.length} conversations:`);
    
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. Conversation: ${row.conversation_id}`);
      console.log(`   Message: "${row.message_body?.substring(0, 50)}..."`);
      console.log(`   From: ${row.from_number} → To: ${row.to_number}`);
      console.log(`   Type: ${row.message_type}, Role: ${row.requestor_role || 'none'}`);
      console.log(`   Time: ${row.timestamp}`);
      console.log('---');
    });
    
    if (result.rows.length === 0) {
      console.log('❌ No conversations found - RLS context issue still exists');
      
      // Test without RLS to see if data exists
      const testQuery = 'SELECT COUNT(*) FROM message_log';
      const testResult = await client.query(testQuery);
      console.log(`📊 Total messages in table (ignoring RLS): ${testResult.rows[0].count}`);
    } else {
      console.log('✅ RLS fix is working! Conversations found.');
    }
    
  } catch (error) {
    console.error('❌ Error testing messages query:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

testMessagesQuery();