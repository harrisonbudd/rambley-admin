import pool from './config/database.js';

const verifyPropertyImport = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying property import...');
    
    // Set RLS context
    await client.query(`SET app.current_account_id = '1'`);
    await client.query(`SET app.current_user_id = '1'`);
    
    // Get basic property info
    const basicQuery = `
      SELECT id, property_title, host_phone, platform, bedrooms, baths, 
             number_of_guests, reviews, rating, wifi_network_name, wifi_password
      FROM properties WHERE account_id = 1
    `;
    const basicResult = await client.query(basicQuery);
    
    if (basicResult.rows.length > 0) {
      const property = basicResult.rows[0];
      console.log('✅ Property found:');
      console.log(`   ID: ${property.id}`);
      console.log(`   Title: ${property.property_title}`);
      console.log(`   Platform: ${property.platform}`);
      console.log(`   Host Phone: ${property.host_phone}`);
      console.log(`   Bedrooms: ${property.bedrooms}, Baths: ${property.baths}`);
      console.log(`   Max Guests: ${property.number_of_guests}`);
      console.log(`   Reviews: ${property.reviews}, Rating: ${property.rating}`);
      console.log(`   WiFi: ${property.wifi_network_name} / ${property.wifi_password}`);
      
      // Test key fields that will be used in messages integration
      console.log('\n🔍 Key integration fields:');
      const integrationQuery = `
        SELECT property_title, property_location, host_phone, check_in_time, check_out_time,
               amenities, guest_access, check_in_method
        FROM properties WHERE account_id = 1
      `;
      const integrationResult = await client.query(integrationQuery);
      const intData = integrationResult.rows[0];
      
      console.log(`   Location: ${intData.property_location}`);
      console.log(`   Check-in: ${intData.check_in_time}, Check-out: ${intData.check_out_time}`);
      console.log(`   Check-in Method: ${intData.check_in_method?.substring(0, 50)}...`);
      console.log(`   Guest Access: ${intData.guest_access?.substring(0, 50)}...`);
      console.log(`   Amenities: ${intData.amenities?.split(',').length} amenities listed`);
      
      // Test phone number matching (for message integration)
      console.log('\n🔍 Testing phone number matching for message integration:');
      const phoneQuery = `
        SELECT COUNT(*) as message_count 
        FROM message_log 
        WHERE (from_number = $1 OR to_number = $1) AND account_id = 1
      `;
      const phoneResult = await client.query(phoneQuery, [intData.host_phone]);
      console.log(`   Messages found with host phone ${intData.host_phone}: ${phoneResult.rows[0].message_count}`);
      
      if (phoneResult.rows[0].message_count > 0) {
        console.log('✅ Property-to-message linking will work!');
      } else {
        console.log('⚠️  No messages found with this phone number yet');
      }
      
    } else {
      console.log('❌ No property found in database');
    }
    
    // Check table structure
    console.log('\n🔍 Verifying table structure:');
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'properties' 
      ORDER BY ordinal_position
    `;
    const columnsResult = await client.query(columnsQuery);
    console.log(`   Table has ${columnsResult.rows.length} columns`);
    
    const keyColumns = ['property_title', 'host_phone', 'property_location', 'amenities', 'wifi_network_name'];
    keyColumns.forEach(col => {
      const found = columnsResult.rows.find(row => row.column_name === col);
      if (found) {
        console.log(`   ✅ ${col}: ${found.data_type}`);
      } else {
        console.log(`   ❌ Missing: ${col}`);
      }
    });
    
    console.log('\n✅ Property import verification completed!');
    
  } catch (error) {
    console.error('❌ Error verifying property import:', error);
  } finally {
    client.release();
    process.exit(0);
  }
};

verifyPropertyImport();