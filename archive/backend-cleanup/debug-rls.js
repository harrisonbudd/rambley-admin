import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:HeQmqgFITpQIWDJFfQeHhtpJevWJTyDE@shortline.proxy.rlwy.net:15142/railway'
});

async function debugRLS() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Debugging RLS and account context...');
    
    // Check what account_ids exist in message_log
    const accountCheck = await client.query('SELECT DISTINCT account_id FROM message_log ORDER BY account_id');
    console.log('📊 Account IDs in message_log:', accountCheck.rows.map(r => r.account_id));
    
    // Check what user_ids exist in users table and their account_ids
    const userCheck = await client.query('SELECT id, account_id FROM users ORDER BY id');
    console.log('📊 Users table:', userCheck.rows);
    
    // Test with different account contexts
    for (const accountId of accountCheck.rows.map(r => r.account_id)) {
      console.log(`\n🔍 Testing with account_id: ${accountId}`);
      
      await client.query('SELECT set_config($1, $2, true)', ['app.current_account_id', accountId.toString()]);
      await client.query('SELECT set_config($1, $2, true)', ['app.current_user_id', '1']);
      
      const result = await client.query(`
        SELECT COUNT(*) FROM message_log 
        WHERE account_id = COALESCE(
          NULLIF(current_setting('app.current_account_id', true), '')::INTEGER,
          (SELECT account_id FROM users WHERE id = COALESCE(
            NULLIF(current_setting('app.current_user_id', true), '')::INTEGER,
            0
          ))
        )
      `);
      
      console.log(`  Messages found: ${result.rows[0].count}`);
    }
    
    // Test the exact RLS condition evaluation
    console.log('\n🔍 Testing RLS condition evaluation...');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_account_id', '1']);
    await client.query('SELECT set_config($1, $2, true)', ['app.current_user_id', '1']);
    
    const rlsTest = await client.query(`
      SELECT 
        current_setting('app.current_account_id', true) as current_account_setting,
        NULLIF(current_setting('app.current_account_id', true), '') as nullif_account,
        NULLIF(current_setting('app.current_account_id', true), '')::INTEGER as account_int,
        (SELECT account_id FROM users WHERE id = 1) as user_account_lookup,
        COALESCE(
          NULLIF(current_setting('app.current_account_id', true), '')::INTEGER,
          (SELECT account_id FROM users WHERE id = COALESCE(
            NULLIF(current_setting('app.current_user_id', true), '')::INTEGER,
            0
          ))
        ) as final_account_id
    `);
    
    console.log('🔍 RLS condition breakdown:', rlsTest.rows[0]);
    
  } catch (error) {
    console.error('❌ Error debugging RLS:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

debugRLS();