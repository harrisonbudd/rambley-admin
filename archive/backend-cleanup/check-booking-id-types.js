import pool from './config/database.js';

const checkBookingIdTypes = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking booking_id data types...');
    
    // Check message_log booking_id type
    console.log('\n1️⃣ message_log.booking_id:');
    const mlTypeQuery = `
      SELECT data_type, character_maximum_length, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'message_log' AND column_name = 'booking_id'
    `;
    const mlTypeResult = await client.query(mlTypeQuery);
    console.log('   Type:', mlTypeResult.rows[0]);
    
    // Check bookings booking_id type  
    console.log('\n2️⃣ bookings.booking_id:');
    const bTypeQuery = `
      SELECT data_type, character_maximum_length, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'bookings' AND column_name = 'booking_id'
    `;
    const bTypeResult = await client.query(bTypeQuery);
    console.log('   Type:', bTypeResult.rows[0]);
    
    // Sample data from both tables
    console.log('\n3️⃣ Sample booking_id values:');
    const sampleQuery = `
      SELECT 'message_log' as source, booking_id, pg_typeof(booking_id) as actual_type
      FROM message_log 
      WHERE booking_id IS NOT NULL 
      LIMIT 3
      UNION ALL
      SELECT 'bookings' as source, booking_id, pg_typeof(booking_id) as actual_type
      FROM bookings 
      LIMIT 3
    `;
    const sampleResult = await client.query(sampleQuery);
    sampleResult.rows.forEach(row => {
      console.log(`   ${row.source}: "${row.booking_id}" (${row.actual_type})`);
    });
    
  } catch (error) {
    console.error('❌ Error checking types:', error);
  } finally {
    client.release();
    process.exit(0);
  }
};

checkBookingIdTypes();