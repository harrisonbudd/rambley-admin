import pool from '../config/database.js';

const createMessageLogTable = async () => {
  try {
    console.log('🔄 Creating message_log table...');

    // Create message_log table based on d:messageLog structure
    await pool.query(`
      CREATE TABLE IF NOT EXISTS message_log (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        message_uuid VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        from_number VARCHAR(50),
        to_number VARCHAR(50),
        message_body TEXT,
        image_url TEXT,
        message_type VARCHAR(50) DEFAULT 'Outbound',
        reference_message_uuids TEXT,
        reference_task_uuids TEXT,
        booking_id VARCHAR(255),
        ai_enrichment_uuid VARCHAR(255),
        raw_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_message_log_account_id ON message_log(account_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_message_log_message_uuid ON message_log(message_uuid)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_message_log_booking_id ON message_log(booking_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_message_log_timestamp ON message_log(timestamp DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_message_log_from_number ON message_log(from_number)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_message_log_to_number ON message_log(to_number)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_message_log_ai_enrichment_uuid ON message_log(ai_enrichment_uuid)');

    // Enable Row Level Security
    await pool.query('ALTER TABLE message_log ENABLE ROW LEVEL SECURITY');

    // Drop existing policy if it exists (for re-running migration)
    await pool.query('DROP POLICY IF EXISTS message_log_account_isolation ON message_log');

    // Create RLS policy for message_log
    await pool.query(`
      CREATE POLICY message_log_account_isolation ON message_log
      FOR ALL 
      USING (
        account_id = COALESCE(
          NULLIF(current_setting('app.current_account_id', true), '')::INTEGER,
          (SELECT account_id FROM users WHERE id = COALESCE(
            NULLIF(current_setting('app.current_user_id', true), '')::INTEGER,
            0
          ))
        )
      )
      WITH CHECK (
        account_id = COALESCE(
          NULLIF(current_setting('app.current_account_id', true), '')::INTEGER,
          (SELECT account_id FROM users WHERE id = COALESCE(
            NULLIF(current_setting('app.current_user_id', true), '')::INTEGER,
            0
          ))
        )
      )
    `);

    console.log('✅ message_log table created successfully');
    console.log('✅ Indexes and Row Level Security configured');
    
  } catch (error) {
    console.error('💥 Message log migration failed:', error);
    throw error;
  }
};

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createMessageLogTable()
    .then(() => {
      console.log('Message log migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Message log migration failed:', error);
      process.exit(1);
    });
}

export default createMessageLogTable;