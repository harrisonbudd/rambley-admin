import pool from './config/database.js';

const testConnection = async () => {
  try {
    console.log('🔍 Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Present' : 'Missing');
    
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Database query successful');
    console.log('Current time:', result.rows[0].current_time);
    console.log('Database version:', result.rows[0].db_version.substring(0, 50) + '...');
    
    client.release();
    
    // Test a users query
    console.log('\n🔍 Testing users table...');
    const client2 = await pool.connect();
    const usersResult = await client2.query('SELECT COUNT(*) as user_count FROM users');
    console.log('✅ Users table accessible');
    console.log('User count:', usersResult.rows[0].user_count);
    
    client2.release();
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error code:', error.code);
    
    if (error.code === '3D000') {
      console.error('💡 Database does not exist');
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 DNS resolution failed - check network connection');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Connection refused - database server may be down');
    }
  }
  
  process.exit(0);
};

testConnection();