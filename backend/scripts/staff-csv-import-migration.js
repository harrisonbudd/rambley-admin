import pool from '../config/database.js';
import fs from 'fs';

const importStaffFromCSV = async () => {
  try {
    console.log('🔄 Starting staff CSV import migration...');

    // Read and parse the CSV file
    const csvPath = '/Users/harrisonbudd/Downloads/AI Villa Assistant - d_staff.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    // Get header and data lines
    const headerLine = lines[0];
    const dataLines = lines.slice(1).filter(line => line.trim() !== '');
    
    console.log(`📊 Found ${dataLines.length} staff records to import`);

    // Parse CSV with proper handling of commas in quoted strings and JSON
    const parseCSVLine = (line) => {
      const values = [];
      let current = '';
      let inQuotes = false;
      let bracketDepth = 0;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"' && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else if (char === '"') {
          inQuotes = !inQuotes;
          current += char;
        } else if (char === '{' && inQuotes) {
          bracketDepth++;
          current += char;
        } else if (char === '}' && inQuotes) {
          bracketDepth--;
          current += char;
        } else if (char === ',' && !inQuotes && bracketDepth === 0) {
          values.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      
      if (current) {
        values.push(current);
      }
      
      // Clean up values - remove surrounding quotes
      return values.map(val => {
        if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
          return val.slice(1, -1);
        }
        return val || null; // Convert empty strings to null
      });
    };

    // Helper functions for data conversion
    const parseInteger = (val) => {
      if (val === null || val === '' || val === undefined) return null;
      const num = parseInt(val);
      return isNaN(num) ? null : num;
    };

    // Drop existing staff table and create new one
    console.log('🗑️ Dropping existing staff table if exists...');
    await pool.query('DROP TABLE IF EXISTS staff CASCADE');

    console.log('🏗️ Creating new staff table with CSV schema...');
    await pool.query(`
      CREATE TABLE staff (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- CSV Fields with exact header mapping
        staff_json TEXT,
        property_id INTEGER,
        staff_id INTEGER,
        staff_name VARCHAR(255),
        phone VARCHAR(255),
        preferred_language VARCHAR(10),
        role VARCHAR(50)
      )
    `);

    console.log('📝 Inserting staff data...');
    
    let insertedCount = 0;
    
    for (const dataLine of dataLines) {
      const values = parseCSVLine(dataLine);
      
      // Skip empty rows
      if (values.every(val => val === null || val === '')) {
        continue;
      }
      
      console.log(`📋 Processing staff record with ${values.length} values`);
      
      // Map CSV values to database fields (7 fields total)
      const staffData = {
        staff_json: values[0] || null,
        property_id: parseInteger(values[1]),
        staff_id: parseInteger(values[2]),
        staff_name: values[3] || null,
        phone: values[4] || null,
        preferred_language: values[5] || null,
        role: values[6] || null
      };

      // Only insert if there's meaningful staff data
      if (staffData.staff_name || staffData.staff_id) {
        
        const insertQuery = `
          INSERT INTO staff (
            account_id, staff_json, property_id, staff_id, staff_name, 
            phone, preferred_language, role
          ) VALUES (
            1, $1, $2, $3, $4, $5, $6, $7
          ) RETURNING id, staff_id, staff_name, phone, role
        `;

        const insertValues = [
          staffData.staff_json, staffData.property_id, staffData.staff_id,
          staffData.staff_name, staffData.phone, staffData.preferred_language, 
          staffData.role
        ];

        const result = await pool.query(insertQuery, insertValues);
        const insertedStaff = result.rows[0];
        
        console.log(`✅ Inserted staff ID ${insertedStaff.id}: ${insertedStaff.staff_name} (${insertedStaff.role}) - ${insertedStaff.phone}`);
        insertedCount++;
      }
    }

    console.log('✅ Staff CSV import completed successfully!');
    console.log(`📊 Total staff imported: ${insertedCount}`);

    // Verify the import
    const verifyQuery = 'SELECT COUNT(*) as count FROM staff WHERE account_id = 1';
    const verifyResult = await pool.query(verifyQuery);
    console.log(`📈 Total staff in database: ${verifyResult.rows[0].count}`);

    // Show sample of imported data
    const sampleQuery = `
      SELECT id, staff_id, staff_name, phone, preferred_language, role, property_id
      FROM staff 
      WHERE account_id = 1 
      ORDER BY staff_id
    `;
    const sampleResult = await pool.query(sampleQuery);
    
    console.log('\n📋 Imported staff members:');
    sampleResult.rows.forEach((staff, i) => {
      console.log(`  ${i + 1}. ${staff.staff_name} (ID: ${staff.staff_id})`);
      console.log(`     Role: ${staff.role}`);
      console.log(`     Phone: ${staff.phone}`);
      console.log(`     Language: ${staff.preferred_language || 'Not specified'}`);
      console.log(`     Property: ${staff.property_id}`);
      console.log('     ---');
    });

    // Check for interesting patterns
    console.log('\n🔍 Data analysis:');
    
    // Count by role
    const roleQuery = `
      SELECT role, COUNT(*) as count 
      FROM staff 
      WHERE account_id = 1 
      GROUP BY role 
      ORDER BY count DESC
    `;
    const roleResult = await pool.query(roleQuery);
    console.log('📊 Staff by role:');
    roleResult.rows.forEach(row => {
      console.log(`   ${row.role}: ${row.count}`);
    });
    
    // Count by language
    const langQuery = `
      SELECT preferred_language, COUNT(*) as count 
      FROM staff 
      WHERE account_id = 1 
      GROUP BY preferred_language 
      ORDER BY count DESC
    `;
    const langResult = await pool.query(langQuery);
    console.log('📊 Staff by language:');
    langResult.rows.forEach(row => {
      console.log(`   ${row.preferred_language || 'Not specified'}: ${row.count}`);
    });
    
    // Check for shared phone numbers
    const phoneQuery = `
      SELECT phone, COUNT(*) as count, STRING_AGG(staff_name, ', ') as names
      FROM staff 
      WHERE account_id = 1 AND phone IS NOT NULL
      GROUP BY phone
      HAVING COUNT(*) > 1
    `;
    const phoneResult = await pool.query(phoneQuery);
    if (phoneResult.rows.length > 0) {
      console.log('📊 Shared phone numbers:');
      phoneResult.rows.forEach(row => {
        console.log(`   ${row.phone}: ${row.names} (${row.count} people)`);
      });
    }

    return { count: insertedCount };

  } catch (error) {
    console.error('💥 Staff CSV import failed:', error);
    throw error;
  }
};

export { importStaffFromCSV };

// If running this script directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importStaffFromCSV()
    .then((result) => {
      console.log(`✅ Migration completed successfully - ${result.count} staff members imported`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}