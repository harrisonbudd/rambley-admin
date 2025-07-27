import pool from '../config/database.js';

const createMultiTenantStructure = async () => {
  try {
    console.log('🔄 Creating multi-tenant structure with RLS...');

    // 1. Create accounts table (organizations/companies)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        subscription_tier VARCHAR(50) DEFAULT 'basic',
        max_properties INTEGER DEFAULT 10,
        max_contacts INTEGER DEFAULT 100,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Create default demo account FIRST (before adding foreign key constraints)
    const accountCheck = await pool.query('SELECT COUNT(*) FROM accounts');
    const accountCount = parseInt(accountCheck.rows[0].count);

    let defaultAccountId = 1;
    if (accountCount === 0) {
      console.log('🏢 Creating default demo account...');
      
      const accountResult = await pool.query(`
        INSERT INTO accounts (name, slug, max_properties, max_contacts) 
        VALUES ('Demo Property Management', 'demo', 50, 500) 
        RETURNING id
      `);
      
      defaultAccountId = accountResult.rows[0].id;
      console.log(`✅ Demo account created with ID: ${defaultAccountId}`);
    } else {
      // Get the first account ID if accounts already exist
      const firstAccount = await pool.query('SELECT id FROM accounts ORDER BY id LIMIT 1');
      defaultAccountId = firstAccount.rows[0].id;
      console.log(`✅ Using existing account ID: ${defaultAccountId}`);
    }

    // 3. Add account_id to users table (if column doesn't exist)
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='account_id') THEN
          ALTER TABLE users ADD COLUMN account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // 4. Add account_id to properties table (if column doesn't exist) - NOW with valid default
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='properties' AND column_name='account_id') THEN
          ALTER TABLE properties ADD COLUMN account_id INTEGER NOT NULL DEFAULT ${defaultAccountId} REFERENCES accounts(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // 5. Add account_id to contacts table (if column doesn't exist) - NOW with valid default
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='contacts' AND column_name='account_id') THEN
          ALTER TABLE contacts ADD COLUMN account_id INTEGER NOT NULL DEFAULT ${defaultAccountId} REFERENCES accounts(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // 6. Update existing users to belong to demo account
    await pool.query(`
      UPDATE users 
      SET account_id = $1 
      WHERE account_id IS NULL
    `, [defaultAccountId]);

    // 7. Create indexes for account_id fields
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_account_id ON users(account_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_properties_account_id ON properties(account_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON contacts(account_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_accounts_slug ON accounts(slug)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(is_active)');

    console.log('✅ Multi-tenant structure created successfully');
    console.log('✅ All existing users assigned to demo account');

    // 8. Enable RLS on all tenant-specific tables
    console.log('🔒 Enabling Row Level Security...');
    
    await pool.query('ALTER TABLE properties ENABLE ROW LEVEL SECURITY');
    await pool.query('ALTER TABLE contacts ENABLE ROW LEVEL SECURITY');
    await pool.query('ALTER TABLE contact_service_locations ENABLE ROW LEVEL SECURITY');

    // 9. Drop existing policies if they exist (for re-running migration)
    await pool.query('DROP POLICY IF EXISTS properties_account_isolation ON properties');
    await pool.query('DROP POLICY IF EXISTS contacts_account_isolation ON contacts');
    await pool.query('DROP POLICY IF EXISTS contact_locations_account_isolation ON contact_service_locations');

    // 10. Create RLS policies for properties
    await pool.query(`
      CREATE POLICY properties_account_isolation ON properties
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

    // 11. Create RLS policies for contacts
    await pool.query(`
      CREATE POLICY contacts_account_isolation ON contacts
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

    // 12. Create RLS policies for contact_service_locations (via contacts and properties)
    await pool.query(`
      CREATE POLICY contact_locations_account_isolation ON contact_service_locations
      FOR ALL 
      USING (
        EXISTS (
          SELECT 1 FROM contacts c 
          WHERE c.id = contact_service_locations.contact_id 
          AND c.account_id = COALESCE(
            NULLIF(current_setting('app.current_account_id', true), '')::INTEGER,
            (SELECT account_id FROM users WHERE id = COALESCE(
              NULLIF(current_setting('app.current_user_id', true), '')::INTEGER,
              0
            ))
          )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM contacts c 
          WHERE c.id = contact_service_locations.contact_id 
          AND c.account_id = COALESCE(
            NULLIF(current_setting('app.current_account_id', true), '')::INTEGER,
            (SELECT account_id FROM users WHERE id = COALESCE(
              NULLIF(current_setting('app.current_user_id', true), '')::INTEGER,
              0
            ))
          )
        )
      )
    `);

    console.log('✅ Row Level Security policies created');

    // 13. Create database roles and grants
    console.log('👤 Setting up database roles...');
    
    // Create authenticated role if it doesn't exist
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated;
        END IF;
      END $$;
    `);

    // Grant necessary permissions
    await pool.query('GRANT USAGE ON SCHEMA public TO authenticated');
    await pool.query('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated');
    await pool.query('GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated');

    console.log('✅ Database roles configured');
    console.log('🎉 Multi-tenant structure with RLS setup completed!');
    
  } catch (error) {
    console.error('💥 Multi-tenant migration failed:', error);
    throw error;
  }
};

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createMultiTenantStructure()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default createMultiTenantStructure; 