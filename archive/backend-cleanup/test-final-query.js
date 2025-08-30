import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:HeQmqgFITpQIWDJFfQeHhtpJevWJTyDE@shortline.proxy.rlwy.net:15142/railway'
});

async function testFinalQuery() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing final conversations query with SET syntax...');
    
    // Set context using SET syntax (the fix we implemented)
    await client.query(`SET app.current_account_id = '1'`);
    await client.query(`SET app.current_user_id = '1'`);
    
    // Use the exact query from our messages API
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
    
    const result = await client.query(conversationsQuery);
    
    console.log(`📊 Query returned ${result.rows.length} conversations:`);
    
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. Conversation: ${row.conversation_id}`);
      console.log(`   Message: "${row.message_body?.substring(0, 50)}..."`);
      console.log(`   From: ${row.from_number} → To: ${row.to_number}`);
      console.log(`   Type: ${row.message_type}, Role: ${row.requestor_role || 'none'}`);
      console.log(`   Time: ${row.timestamp}`);
      console.log('---');
    });
    
    if (result.rows.length > 0) {
      console.log('✅ SUCCESS! RLS fix is working with SET syntax');
      
      // Test a conversation detail query too
      const firstConversationId = result.rows[0].conversation_id;
      console.log(`\n🔍 Testing conversation detail for: ${firstConversationId}`);
      
      let whereClause;
      let queryParams = [500]; // limit
      
      if (firstConversationId.startsWith('no_booking_')) {
        const parts = firstConversationId.replace('no_booking_', '').split('_');
        if (parts.length >= 2) {
          const phone1 = parts.slice(0, -1).join('_');
          const phone2 = parts[parts.length - 1];
          whereClause = `
            AND booking_id IS NULL 
            AND (
              (from_number = $2 AND to_number = $3) OR
              (from_number = $3 AND to_number = $2)
            )
          `;
          queryParams.push(phone1, phone2);
        }
      } else {
        whereClause = 'AND booking_id = $2';
        queryParams.push(firstConversationId);
      }
      
      const messagesQuery = `
        SELECT 
          id, message_uuid, timestamp, from_number, to_number,
          message_body, message_type, requestor_role, booking_id
        FROM message_log
        WHERE account_id = COALESCE(
          NULLIF(current_setting('app.current_account_id', true), '')::INTEGER,
          (SELECT account_id FROM users WHERE id = COALESCE(
            NULLIF(current_setting('app.current_user_id', true), '')::INTEGER,
            0
          ))
        )
        ${whereClause}
        ORDER BY timestamp ASC
        LIMIT $1
      `;
      
      const messagesResult = await client.query(messagesQuery, queryParams);
      console.log(`📊 Found ${messagesResult.rows.length} messages in this conversation`);
    }
    
  } catch (error) {
    console.error('❌ Error testing final query:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

testFinalQuery();