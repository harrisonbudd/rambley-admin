import pool from './config/database.js';

const addBookingIndex = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Adding database index on message_log.booking_id...');
    
    // Create index for performance optimization on booking_id lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_message_log_booking_id 
      ON message_log(booking_id)
    `);
    
    console.log('✅ Index created successfully');
    
    // Verify the index was created
    const indexQuery = `
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'message_log' AND indexname = 'idx_message_log_booking_id'
    `;
    const result = await client.query(indexQuery);
    
    if (result.rows.length > 0) {
      console.log('✅ Index verified:', result.rows[0].indexdef);
    } else {
      console.log('❌ Index not found');
    }
    
  } catch (error) {
    console.error('❌ Error creating index:', error);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
};

addBookingIndex();