import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:HeQmqgFITpQIWDJFfQeHhtpJevWJTyDE@shortline.proxy.rlwy.net:15142/railway'
});

async function testConfigFix() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing different set_config approaches...');
    
    // Method 1: Original approach
    await client.query('SELECT set_config($1, $2, true)', ['app.current_account_id', '1']);
    let result1 = await client.query("SELECT current_setting('app.current_account_id', true)");
    console.log('Method 1 (parameterized):', result1.rows[0].current_setting);
    
    // Method 2: Direct string interpolation
    await client.query("SELECT set_config('app.current_account_id', '1', true)");
    let result2 = await client.query("SELECT current_setting('app.current_account_id', true)");
    console.log('Method 2 (direct):', result2.rows[0].current_setting);
    
    // Method 3: Using format function
    await client.query("SELECT set_config('app.current_account_id', $1::text, true)", ['1']);
    let result3 = await client.query("SELECT current_setting('app.current_account_id', true)");
    console.log('Method 3 (cast to text):', result3.rows[0].current_setting);
    
    // Test the query with working config
    const testQuery = `
      SELECT COUNT(*) FROM message_log 
      WHERE account_id = COALESCE(
        NULLIF(current_setting('app.current_account_id', true), '')::INTEGER,
        (SELECT account_id FROM users WHERE id = COALESCE(
          NULLIF(current_setting('app.current_user_id', true), '')::INTEGER,
          0
        ))
      )
    `;
    
    const testResult = await client.query(testQuery);
    console.log('Messages found with working config:', testResult.rows[0].count);
    
  } catch (error) {
    console.error('❌ Error testing config fix:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

testConfigFix();