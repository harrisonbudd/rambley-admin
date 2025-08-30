import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:HeQmqgFITpQIWDJFfQeHhtpJevWJTyDE@shortline.proxy.rlwy.net:15142/railway'
});

async function checkUsers() {
  const client = await pool.connect();
  
  try {
    const result = await client.query('SELECT id, email, password_hash, account_id FROM users');
    console.log('Users in database:', result.rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

checkUsers();