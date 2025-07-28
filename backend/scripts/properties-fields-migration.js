import pool from '../config/database.js';

const addPropertyFields = async () => {
  try {
    console.log('🔄 Adding missing property fields to database...');

    // Add new columns to properties table (if they don't exist)
    const fieldsToAdd = [
      { name: 'property_type', type: 'VARCHAR(50)' },
      { name: 'bedrooms', type: 'INTEGER DEFAULT 0' },
      { name: 'bathrooms', type: 'DECIMAL DEFAULT 0' },
      { name: 'max_guests', type: 'INTEGER DEFAULT 1' },
      { name: 'checkin_time', type: 'VARCHAR(20) DEFAULT \'3:00 PM\'' },
      { name: 'checkout_time', type: 'VARCHAR(20) DEFAULT \'11:00 AM\'' },
      { name: 'wifi_name', type: 'VARCHAR(255)' },
      { name: 'wifi_password', type: 'VARCHAR(255)' },
      { name: 'emergency_contact', type: 'VARCHAR(100)' },
      { name: 'instructions', type: 'TEXT' },
      { name: 'house_rules', type: 'TEXT' }
    ];

    for (const field of fieldsToAdd) {
      await pool.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name='properties' AND column_name='${field.name}') THEN
            ALTER TABLE properties ADD COLUMN ${field.name} ${field.type};
          END IF;
        END $$;
      `);
      console.log(`✅ Added ${field.name} field to properties table`);
    }

    console.log('✅ Property fields migration completed successfully');

  } catch (error) {
    console.error('💥 Property fields migration failed:', error);
    throw error;
  }
};

export { addPropertyFields }; 