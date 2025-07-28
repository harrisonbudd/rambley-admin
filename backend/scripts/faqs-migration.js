import pool from '../config/database.js';

const createFAQsStructure = async () => {
  try {
    console.log('🔄 Creating FAQs table structure...');

    // 0. Ensure required tables exist
    
    // Create accounts table
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

    // Create users table (simplified version)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create properties table (simplified version)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure demo account exists
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

    // 1. Create FAQ categories table first
    await pool.query(`
      CREATE TABLE IF NOT EXISTS faq_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#3B82F6',
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, account_id)
      )
    `);

    // 2. Create main FAQs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS faqs (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT,
        answer_type VARCHAR(20) DEFAULT 'unanswered' CHECK (answer_type IN ('llm', 'host', 'unanswered')),
        confidence DECIMAL(3,2) DEFAULT 0.0,
        ask_count INTEGER DEFAULT 0,
        last_asked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        category_id INTEGER REFERENCES faq_categories(id) ON DELETE SET NULL,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Create FAQ tags table for flexible categorization
    await pool.query(`
      CREATE TABLE IF NOT EXISTS faq_tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, account_id)
      )
    `);

    // 4. Create junction table for FAQ-tag relationships
    await pool.query(`
      CREATE TABLE IF NOT EXISTS faq_tag_relationships (
        faq_id INTEGER REFERENCES faqs(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES faq_tags(id) ON DELETE CASCADE,
        PRIMARY KEY (faq_id, tag_id)
      )
    `);

    // 5. Create FAQ analytics table for tracking usage
    await pool.query(`
      CREATE TABLE IF NOT EXISTS faq_analytics (
        id SERIAL PRIMARY KEY,
        faq_id INTEGER REFERENCES faqs(id) ON DELETE CASCADE,
        asked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        asked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        source VARCHAR(50) DEFAULT 'web',
        user_agent TEXT,
        ip_address INET,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE
      )
    `);

    // 6. Create indexes for performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_faqs_account_id ON faqs(account_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_faqs_property_id ON faqs(property_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_faqs_category_id ON faqs(category_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_faqs_answer_type ON faqs(answer_type)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_faqs_is_active ON faqs(is_active)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_faqs_last_asked ON faqs(last_asked)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_faqs_ask_count ON faqs(ask_count)');
    
    await pool.query('CREATE INDEX IF NOT EXISTS idx_faq_categories_account_id ON faq_categories(account_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_faq_tags_account_id ON faq_tags(account_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_faq_analytics_account_id ON faq_analytics(account_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_faq_analytics_faq_id ON faq_analytics(faq_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_faq_analytics_asked_at ON faq_analytics(asked_at)');

    // 7. Create full-text search index for questions and answers
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_faqs_search 
      ON faqs USING GIN(to_tsvector('english', question || ' ' || COALESCE(answer, '')))
    `);

    // 8. Enable RLS on FAQ tables
    console.log('🔒 Enabling Row Level Security for FAQs...');
    
    await pool.query('ALTER TABLE faqs ENABLE ROW LEVEL SECURITY');
    await pool.query('ALTER TABLE faq_categories ENABLE ROW LEVEL SECURITY');
    await pool.query('ALTER TABLE faq_tags ENABLE ROW LEVEL SECURITY');
    await pool.query('ALTER TABLE faq_tag_relationships ENABLE ROW LEVEL SECURITY');
    await pool.query('ALTER TABLE faq_analytics ENABLE ROW LEVEL SECURITY');

    // 9. Drop existing policies if they exist (for re-running migration)
    await pool.query('DROP POLICY IF EXISTS faqs_account_isolation ON faqs');
    await pool.query('DROP POLICY IF EXISTS faq_categories_account_isolation ON faq_categories');
    await pool.query('DROP POLICY IF EXISTS faq_tags_account_isolation ON faq_tags');
    await pool.query('DROP POLICY IF EXISTS faq_tag_relationships_account_isolation ON faq_tag_relationships');
    await pool.query('DROP POLICY IF EXISTS faq_analytics_account_isolation ON faq_analytics');

    // 10. Create RLS policies for FAQs
    await pool.query(`
      CREATE POLICY faqs_account_isolation ON faqs
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

    // 11. Create RLS policies for FAQ categories
    await pool.query(`
      CREATE POLICY faq_categories_account_isolation ON faq_categories
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

    // 12. Create RLS policies for FAQ tags
    await pool.query(`
      CREATE POLICY faq_tags_account_isolation ON faq_tags
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

    // 13. Create RLS policies for FAQ tag relationships (via FAQ isolation)
    await pool.query(`
      CREATE POLICY faq_tag_relationships_account_isolation ON faq_tag_relationships
      FOR ALL 
      USING (
        EXISTS (
          SELECT 1 FROM faqs f 
          WHERE f.id = faq_tag_relationships.faq_id 
          AND f.account_id = COALESCE(
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
          SELECT 1 FROM faqs f 
          WHERE f.id = faq_tag_relationships.faq_id 
          AND f.account_id = COALESCE(
            NULLIF(current_setting('app.current_account_id', true), '')::INTEGER,
            (SELECT account_id FROM users WHERE id = COALESCE(
              NULLIF(current_setting('app.current_user_id', true), '')::INTEGER,
              0
            ))
          )
        )
      )
    `);

    // 14. Create RLS policies for FAQ analytics
    await pool.query(`
      CREATE POLICY faq_analytics_account_isolation ON faq_analytics
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

    // 15. Create some default categories for demo account
    const demoAccountResult = await pool.query(`
      SELECT id FROM accounts WHERE slug = 'demo' LIMIT 1
    `);

    if (demoAccountResult.rows.length > 0) {
      const demoAccountId = demoAccountResult.rows[0].id;
      
      await pool.query(`
        INSERT INTO faq_categories (name, description, color, account_id) 
        VALUES 
          ('General', 'General property management questions', '#3B82F6', $1),
          ('Maintenance', 'Property maintenance and repairs', '#10B981', $1),
          ('Leasing', 'Tenant and leasing inquiries', '#F59E0B', $1),
          ('Policies', 'Property policies and procedures', '#EF4444', $1)
        ON CONFLICT (name, account_id) DO NOTHING
      `, [demoAccountId]);
      
      console.log('✅ Default FAQ categories created for demo account');
    }

    console.log('✅ FAQs table structure created successfully');
    console.log('✅ Row Level Security policies applied');
    console.log('✅ Indexes created for optimal performance');
    console.log('✅ Full-text search enabled for questions and answers');
    
  } catch (error) {
    console.error('💥 FAQs migration failed:', error);
    throw error;
  }
};

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createFAQsStructure()
    .then(() => {
      console.log('FAQs migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('FAQs migration failed:', error);
      process.exit(1);
    });
}

export default createFAQsStructure;