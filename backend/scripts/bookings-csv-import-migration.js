import pool from '../config/database.js';
import fs from 'fs';

const importBookingsFromCSV = async () => {
  try {
    console.log('🔄 Starting bookings CSV import migration...');

    // Read and parse the CSV file
    const csvPath = '/Users/harrisonbudd/Downloads/AI Villa Assistant - d_bookingInfo.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    // Get header and data lines
    const headerLine = lines[0];
    const dataLines = lines.slice(1).filter(line => line.trim() !== '');
    
    console.log(`📊 Found ${dataLines.length} data rows to import`);

    // Parse CSV with proper handling of commas in quoted strings
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

    const parseDate = (val) => {
      if (val === null || val === '' || val === undefined) return null;
      try {
        // Handle MM/DD/YYYY format
        if (val.includes('/')) {
          const [month, day, year] = val.split('/');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        // Handle ISO format
        const date = new Date(val);
        return date.toISOString().split('T')[0];
      } catch (e) {
        return null;
      }
    };

    const parseTimestamp = (val) => {
      if (val === null || val === '' || val === undefined) return null;
      try {
        const date = new Date(val);
        return date.toISOString();
      } catch (e) {
        return null;
      }
    };

    // Drop existing bookings table and create new one
    console.log('🗑️ Dropping existing bookings table if exists...');
    await pool.query('DROP TABLE IF EXISTS bookings CASCADE');

    console.log('🏗️ Creating new bookings table with CSV schema...');
    await pool.query(`
      CREATE TABLE bookings (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- CSV Fields with exact header mapping
        booking_json TEXT,
        booking_id INTEGER,
        property_id INTEGER,
        host VARCHAR(255),
        date TIMESTAMP,
        empty_column VARCHAR(255),
        type VARCHAR(100),
        confirmation_code VARCHAR(100),
        booking_date DATE,
        start_date DATE,
        end_date DATE,
        nights INTEGER,
        guest VARCHAR(255),
        listing VARCHAR(500),
        empty_column_2 VARCHAR(255),
        phone VARCHAR(255),
        message_sid VARCHAR(255),
        sent_check INTEGER
      )
    `);

    console.log('📝 Inserting booking data...');
    
    let insertedCount = 0;
    
    for (const dataLine of dataLines) {
      const values = parseCSVLine(dataLine);
      
      // Skip empty rows (all values null/empty)
      if (values.every(val => val === null || val === '')) {
        continue;
      }
      
      console.log(`📋 Processing row with ${values.length} values`);
      
      // Map CSV values to database fields (18 fields total)
      const bookingData = {
        booking_json: values[0] || null,
        booking_id: parseInteger(values[1]),
        property_id: parseInteger(values[2]),
        host: values[3] || null,
        date: parseTimestamp(values[4]),
        empty_column: values[5] || null,
        type: values[6] || null,
        confirmation_code: values[7] || null,
        booking_date: parseDate(values[8]),
        start_date: parseDate(values[9]),
        end_date: parseDate(values[10]),
        nights: parseInteger(values[11]),
        guest: values[12] || null,
        listing: values[13] || null,
        empty_column_2: values[14] || null,
        phone: values[15] || null,
        message_sid: values[16] || null,
        sent_check: parseInteger(values[17])
      };

      // Only insert if there's meaningful data (not just property_id and phone)
      if (bookingData.booking_id || bookingData.guest || bookingData.confirmation_code || 
          (bookingData.property_id && bookingData.phone && (bookingData.type || bookingData.host))) {
        
        const insertQuery = `
          INSERT INTO bookings (
            account_id, booking_json, booking_id, property_id, host, date, empty_column,
            type, confirmation_code, booking_date, start_date, end_date, nights,
            guest, listing, empty_column_2, phone, message_sid, sent_check
          ) VALUES (
            1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
          ) RETURNING id, booking_id, guest, phone
        `;

        const insertValues = [
          bookingData.booking_json, bookingData.booking_id, bookingData.property_id,
          bookingData.host, bookingData.date, bookingData.empty_column, bookingData.type,
          bookingData.confirmation_code, bookingData.booking_date, bookingData.start_date,
          bookingData.end_date, bookingData.nights, bookingData.guest, bookingData.listing,
          bookingData.empty_column_2, bookingData.phone, bookingData.message_sid, bookingData.sent_check
        ];

        const result = await pool.query(insertQuery, insertValues);
        const insertedBooking = result.rows[0];
        
        console.log(`✅ Inserted booking ID ${insertedBooking.id}: ${insertedBooking.guest || 'Phone entry'} - ${insertedBooking.phone}`);
        insertedCount++;
      }
    }

    console.log('✅ Bookings CSV import completed successfully!');
    console.log(`📊 Total bookings imported: ${insertedCount}`);

    // Verify the import
    const verifyQuery = 'SELECT COUNT(*) as count FROM bookings WHERE account_id = 1';
    const verifyResult = await pool.query(verifyQuery);
    console.log(`📈 Total bookings in database: ${verifyResult.rows[0].count}`);

    // Show sample of imported data
    const sampleQuery = `
      SELECT id, booking_id, guest, confirmation_code, start_date, end_date, 
             nights, phone, listing, type
      FROM bookings 
      WHERE account_id = 1 
      ORDER BY id 
      LIMIT 5
    `;
    const sampleResult = await pool.query(sampleQuery);
    
    console.log('\n📋 Sample imported bookings:');
    sampleResult.rows.forEach((booking, i) => {
      console.log(`  ${i + 1}. ID: ${booking.id}`);
      console.log(`     Guest: ${booking.guest || 'N/A'}`);
      console.log(`     Dates: ${booking.start_date || 'N/A'} to ${booking.end_date || 'N/A'} (${booking.nights || 'N/A'} nights)`);
      console.log(`     Code: ${booking.confirmation_code || 'N/A'}`);
      console.log(`     Phone: ${booking.phone || 'N/A'}`);
      console.log(`     Type: ${booking.type || 'N/A'}`);
      console.log('     ---');
    });

    return { count: insertedCount };

  } catch (error) {
    console.error('💥 Bookings CSV import failed:', error);
    throw error;
  }
};

export { importBookingsFromCSV };

// If running this script directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importBookingsFromCSV()
    .then((result) => {
      console.log(`✅ Migration completed successfully - ${result.count} bookings imported`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}