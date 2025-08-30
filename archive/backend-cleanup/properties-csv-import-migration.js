import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';

const importPropertiesFromCSV = async () => {
  try {
    console.log('🔄 Starting properties CSV import migration...');

    // Read and parse the CSV file
    const csvPath = '/Users/harrisonbudd/Downloads/AI Villa Assistant - d_propertyInfo.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    // Skip header line and get the data line
    const dataLine = lines[1];
    if (!dataLine || dataLine.trim() === '') {
      throw new Error('No data found in CSV file');
    }

    // Use a more robust CSV parsing approach
    // The CSV has a complex structure where the first column is JSON, followed by individual fields
    // We need to use a proper CSV parser or split more carefully
    
    const values = [];
    let inQuotes = false;
    let current = '';
    let bracketDepth = 0;
    
    for (let i = 0; i < dataLine.length; i++) {
      const char = dataLine[i];
      const nextChar = dataLine[i + 1];
      
      if (char === '"' && nextChar === '"') {
        // Handle escaped quotes
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
    
    console.log(`📊 Parsed ${values.length} values from CSV`);
    
    // Clean up values - remove surrounding quotes
    const cleanedValues = values.map(val => {
      if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
        return val.slice(1, -1);
      }
      return val;
    });

    // Helper functions for data conversion
    const parseBoolean = (val) => {
      if (typeof val === 'string') {
        return val.toUpperCase() === 'TRUE';
      }
      return Boolean(val);
    };

    const parseInteger = (val) => {
      const num = parseInt(val);
      return isNaN(num) ? null : num;
    };

    const parseDecimal = (val) => {
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    };

    const parseTimeFromExcel = (excelDate) => {
      if (!excelDate || excelDate.trim() === '') return null;
      // Excel date serial number to time conversion
      // The CSV shows times like "1899-12-30T13:50:39.000Z" and "1899-12-30T10:50:39.000Z"
      try {
        const date = new Date(excelDate);
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      } catch (e) {
        return excelDate; // Return as-is if parsing fails
      }
    };

    // Drop existing properties table and create new one
    console.log('🗑️ Dropping existing properties table...');
    await pool.query('DROP TABLE IF EXISTS properties CASCADE');

    console.log('🏗️ Creating new properties table with CSV schema...');
    await pool.query(`
      CREATE TABLE properties (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- CSV Fields with exact header mapping
        property_json TEXT,
        property_id INTEGER,
        platform VARCHAR(255),
        host VARCHAR(255),
        host_email VARCHAR(255),
        host_phone VARCHAR(255),
        url VARCHAR(500),
        property_title VARCHAR(500),
        internal_name VARCHAR(500),
        type VARCHAR(100),
        sub_type VARCHAR(100),
        listing_type VARCHAR(100),
        floors_in_building INTEGER,
        listing_floor INTEGER,
        year_built VARCHAR(50),
        property_size VARCHAR(100),
        unit_measurement VARCHAR(50),
        bedrooms INTEGER,
        beds INTEGER,
        baths INTEGER,
        photos INTEGER,
        number_of_guests INTEGER,
        listing_description TEXT,
        your_property TEXT,
        guest_access TEXT,
        interaction_with_guests TEXT,
        other_details_to_note TEXT,
        amenities TEXT,
        property_location TEXT,
        property_google_maps_link VARCHAR(500),
        location_instructions TEXT,
        check_in_time VARCHAR(50),
        check_out_time VARCHAR(50),
        pets_allowed BOOLEAN,
        number_of_pets_allowed INTEGER,
        events_allowed BOOLEAN,
        smoking_vaping_allowed BOOLEAN,
        quiet_hours VARCHAR(255),
        commercial_photography_allowed VARCHAR(255),
        additional_rules TEXT,
        safety_considerations TEXT,
        safety_devices TEXT,
        property_info TEXT,
        reviews INTEGER,
        rating DECIMAL(3,2),
        directions TEXT,
        check_in_method TEXT,
        wifi_network_name VARCHAR(255),
        wifi_password VARCHAR(255),
        house_manual TEXT,
        checkout_instructions_lockup TEXT
      )
    `);

    console.log('📝 Inserting Bali villa property data...');
    
    // Map CSV values to database fields (based on CSV column order)
    const propertyData = {
      property_json: cleanedValues[0] || null,
      property_id: parseInteger(cleanedValues[1]),
      platform: cleanedValues[2] || null,
      host: cleanedValues[3] || null,
      host_email: cleanedValues[4] || null,
      host_phone: cleanedValues[5] || null,
      url: cleanedValues[6] || null,
      property_title: cleanedValues[7] || null,
      internal_name: cleanedValues[8] || null,
      type: cleanedValues[9] || null,
      sub_type: cleanedValues[10] || null,
      listing_type: cleanedValues[11] || null,
      floors_in_building: parseInteger(cleanedValues[12]),
      listing_floor: parseInteger(cleanedValues[13]),
      year_built: cleanedValues[14] || null,
      property_size: cleanedValues[15] || null,
      unit_measurement: cleanedValues[16] || null,
      bedrooms: parseInteger(cleanedValues[17]),
      beds: parseInteger(cleanedValues[18]),
      baths: parseInteger(cleanedValues[19]),
      photos: parseInteger(cleanedValues[20]),
      number_of_guests: parseInteger(cleanedValues[21]),
      listing_description: cleanedValues[22] || null,
      your_property: cleanedValues[23] || null,
      guest_access: cleanedValues[24] || null,
      interaction_with_guests: cleanedValues[25] || null,
      other_details_to_note: cleanedValues[26] || null,
      amenities: cleanedValues[27] || null,
      property_location: cleanedValues[28] || null,
      property_google_maps_link: cleanedValues[29] || null,
      location_instructions: cleanedValues[30] || null,
      check_in_time: parseTimeFromExcel(cleanedValues[31]),
      check_out_time: parseTimeFromExcel(cleanedValues[32]),
      pets_allowed: parseBoolean(cleanedValues[33]),
      number_of_pets_allowed: parseInteger(cleanedValues[34]),
      events_allowed: parseBoolean(cleanedValues[35]),
      smoking_vaping_allowed: parseBoolean(cleanedValues[36]),
      quiet_hours: cleanedValues[37] || null,
      commercial_photography_allowed: cleanedValues[38] || null,
      additional_rules: cleanedValues[39] || null,
      safety_considerations: cleanedValues[40] || null,
      safety_devices: cleanedValues[41] || null,
      property_info: cleanedValues[42] || null,
      reviews: parseInteger(cleanedValues[43]),
      rating: parseDecimal(cleanedValues[44]),
      directions: cleanedValues[45] || null,
      check_in_method: cleanedValues[46] || null,
      wifi_network_name: cleanedValues[47] || null,
      wifi_password: cleanedValues[48] || null,
      house_manual: cleanedValues[49] || null,
      checkout_instructions_lockup: cleanedValues[50] || null
    };
    
    console.log('🔍 Sample property data values:');
    console.log('  Property Title:', propertyData.property_title);
    console.log('  Host Phone:', propertyData.host_phone);
    console.log('  Platform:', propertyData.platform);
    console.log('  Reviews:', propertyData.reviews);
    console.log('  Rating:', propertyData.rating);
    
    // Debug: Count how many property data fields we actually have
    const propertyKeys = Object.keys(propertyData);
    console.log(`🔍 Property data fields count: ${propertyKeys.length}`);
    console.log('🔍 Missing data fields:', propertyKeys.filter(key => propertyData[key] === null || propertyData[key] === undefined));

    // Insert the property with account_id = 1 for RLS compatibility
    const insertQuery = `
      INSERT INTO properties (
        account_id, property_json, property_id, platform, host, host_email, host_phone, url,
        property_title, internal_name, type, sub_type, listing_type, floors_in_building,
        listing_floor, year_built, property_size, unit_measurement, bedrooms, beds, baths,
        photos, number_of_guests, listing_description, your_property, guest_access,
        interaction_with_guests, other_details_to_note, amenities, property_location,
        property_google_maps_link, location_instructions, check_in_time, check_out_time,
        pets_allowed, number_of_pets_allowed, events_allowed, smoking_vaping_allowed,
        quiet_hours, commercial_photography_allowed, additional_rules, safety_considerations,
        safety_devices, property_info, reviews, rating, directions, check_in_method,
        wifi_network_name, wifi_password, house_manual, checkout_instructions_lockup
      ) VALUES (
        1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33,
        $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50
      ) RETURNING id, property_title, host_phone
    `;

    const insertValues = [
      propertyData.property_json, propertyData.property_id, propertyData.platform,
      propertyData.host, propertyData.host_email, propertyData.host_phone,
      propertyData.url, propertyData.property_title, propertyData.internal_name,
      propertyData.type, propertyData.sub_type, propertyData.listing_type,
      propertyData.floors_in_building, propertyData.listing_floor, propertyData.year_built,
      propertyData.property_size, propertyData.unit_measurement, propertyData.bedrooms,
      propertyData.beds, propertyData.baths, propertyData.photos, propertyData.number_of_guests,
      propertyData.listing_description, propertyData.your_property, propertyData.guest_access,
      propertyData.interaction_with_guests, propertyData.other_details_to_note,
      propertyData.amenities, propertyData.property_location, propertyData.property_google_maps_link,
      propertyData.location_instructions, propertyData.check_in_time, propertyData.check_out_time,
      propertyData.pets_allowed, propertyData.number_of_pets_allowed, propertyData.events_allowed,
      propertyData.smoking_vaping_allowed, propertyData.quiet_hours,
      propertyData.commercial_photography_allowed, propertyData.additional_rules,
      propertyData.safety_considerations, propertyData.safety_devices, propertyData.property_info,
      propertyData.reviews, propertyData.rating, propertyData.directions,
      propertyData.check_in_method, propertyData.wifi_network_name, propertyData.wifi_password,
      propertyData.house_manual, propertyData.checkout_instructions_lockup
    ];

    const result = await pool.query(insertQuery, insertValues);
    const insertedProperty = result.rows[0];

    console.log('✅ Properties CSV import completed successfully!');
    console.log('📊 Imported property:');
    console.log(`   ID: ${insertedProperty.id}`);
    console.log(`   Title: ${insertedProperty.property_title}`);
    console.log(`   Host Phone: ${insertedProperty.host_phone}`);

    // Verify the import
    const verifyQuery = 'SELECT COUNT(*) as count FROM properties WHERE account_id = 1';
    const verifyResult = await pool.query(verifyQuery);
    console.log(`📈 Total properties in database: ${verifyResult.rows[0].count}`);

    return insertedProperty;

  } catch (error) {
    console.error('💥 Properties CSV import failed:', error);
    throw error;
  }
};

export { importPropertiesFromCSV };

// If running this script directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importPropertiesFromCSV()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}