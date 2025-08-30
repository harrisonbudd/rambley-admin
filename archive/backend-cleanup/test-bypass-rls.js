import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:HeQmqgFITpQIWDJFfQeHhtpJevWJTyDE@shortline.proxy.rlwy.net:15142/railway'
});

async function testBypassRLS() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing RLS bypass and alternative approaches...');
    
    // Check current role and permissions
    const roleCheck = await client.query('SELECT current_user, current_role');
    console.log('Current user/role:', roleCheck.rows[0]);
    
    // Check if we can set session variables with different syntax
    try {
      await client.query("SET app.current_account_id = '1'");
      const setResult = await client.query("SELECT current_setting('app.current_account_id')");
      console.log('Using SET syntax:', setResult.rows[0].current_setting);
    } catch (e) {
      console.log('SET syntax failed:', e.message);
    }
    
    // Try using a local variable approach instead of RLS
    const directQuery = `
      SELECT COUNT(*) FROM message_log WHERE account_id = 1
    `;
    const directResult = await client.query(directQuery);
    console.log('Direct query (account_id = 1):', directResult.rows[0].count);
    
    // Test the main query with hardcoded account_id instead of RLS
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
        WHERE account_id = $1
        ORDER BY conversation_id, timestamp DESC
      )
      SELECT * FROM latest_messages
      ORDER BY timestamp DESC
      LIMIT 10
    `;
    
    const conversationsResult = await client.query(conversationsQuery, [1]);
    console.log('Conversations with hardcoded account_id:', conversationsResult.rows.length);
    
    if (conversationsResult.rows.length > 0) {
      console.log('✅ Found conversations! First one:');
      console.log('  Conversation ID:', conversationsResult.rows[0].conversation_id);
      console.log('  Message:', conversationsResult.rows[0].message_body?.substring(0, 50) + '...');
      console.log('  From:', conversationsResult.rows[0].from_number);
    }
    
  } catch (error) {
    console.error('❌ Error testing RLS bypass:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

testBypassRLS();