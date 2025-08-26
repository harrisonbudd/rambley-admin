import pool from '../config/database.js';

const createGuestMessagesTable = async () => {
  try {
    console.log('🔄 Creating guest_messages table...');

    // Create guest_messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS guest_messages (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        property_id VARCHAR(255),
        booking_id VARCHAR(255),
        guest_message TEXT NOT NULL,
        property_details_json JSONB,
        booking_details_json JSONB,
        property_faqs_json JSONB,
        escalation_risk_indicators TEXT,
        available_knowledge VARCHAR(255),
        sub_category VARCHAR(255),
        raw_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_guest_messages_account_id ON guest_messages(account_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_guest_messages_property_id ON guest_messages(property_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_guest_messages_booking_id ON guest_messages(booking_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_guest_messages_created_at ON guest_messages(created_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_guest_messages_sub_category ON guest_messages(sub_category)');

    // Enable Row Level Security
    await pool.query('ALTER TABLE guest_messages ENABLE ROW LEVEL SECURITY');

    // Drop existing policy if it exists (for re-running migration)
    await pool.query('DROP POLICY IF EXISTS guest_messages_account_isolation ON guest_messages');

    // Create RLS policy for guest_messages
    await pool.query(`
      CREATE POLICY guest_messages_account_isolation ON guest_messages
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

    console.log('✅ guest_messages table created successfully');
    console.log('✅ Indexes and Row Level Security configured');
    
  } catch (error) {
    console.error('💥 Guest messages migration failed:', error);
    throw error;
  }
};

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createGuestMessagesTable()
    .then(() => {
      console.log('Guest messages migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Guest messages migration failed:', error);
      process.exit(1);
    });
}

export default createGuestMessagesTable;