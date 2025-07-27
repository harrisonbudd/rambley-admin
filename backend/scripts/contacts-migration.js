import pool from '../config/database.js';

const createContactsTables = async () => {
  try {
    console.log('🔄 Creating contacts system tables...');

    // Create properties table first (referenced by contacts)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create contacts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        service_type VARCHAR(100) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        preferred_language VARCHAR(10) DEFAULT 'en',
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create junction table for contact service locations (many-to-many)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_service_locations (
        id SERIAL PRIMARY KEY,
        contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(contact_id, property_id)
      )
    `);

    // Create indexes for better performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_contacts_service_type ON contacts(service_type)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_contacts_active ON contacts(is_active)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_contacts_language ON contacts(preferred_language)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_properties_active ON properties(is_active)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_service_locations_contact ON contact_service_locations(contact_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_service_locations_property ON contact_service_locations(property_id)');

    console.log('✅ Contacts system tables created successfully');
    console.log('🎉 Contacts system setup completed successfully!');
    
  } catch (error) {
    console.error('💥 Contacts migration failed:', error);
    throw error;
  }
};

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createContactsTables()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default createContactsTables; 