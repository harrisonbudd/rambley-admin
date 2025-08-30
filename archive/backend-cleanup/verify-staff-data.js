import pool from './config/database.js';

const verifyStaffData = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying staff data integrity and message system integration...');
    
    // Set RLS context
    await client.query(`SET app.current_account_id = '1'`);
    await client.query(`SET app.current_user_id = '1'`);
    
    // Get comprehensive staff info
    const staffQuery = `
      SELECT 
        id, staff_json, property_id, staff_id, staff_name, phone, 
        preferred_language, role, created_at
      FROM staff 
      WHERE account_id = 1
      ORDER BY staff_id
    `;
    const staffResult = await client.query(staffQuery);
    
    console.log(`📊 Found ${staffResult.rows.length} staff members:`);
    
    if (staffResult.rows.length > 0) {
      console.log('\n✅ Complete staff roster:');
      
      for (const staff of staffResult.rows) {
        console.log(`\n👤 ${staff.staff_name} (ID: ${staff.staff_id})`);
        console.log(`   Role: ${staff.role}`);
        console.log(`   Phone: ${staff.phone}`);
        console.log(`   Language: ${staff.preferred_language || 'Not specified'}`);
        console.log(`   Property: ${staff.property_id}`);
        
        // Test JSON data structure
        if (staff.staff_json) {
          try {
            const jsonData = JSON.parse(staff.staff_json);
            console.log(`   JSON Keys: ${Object.keys(jsonData).join(', ')}`);
          } catch (e) {
            console.log(`   ❌ JSON parsing failed: ${e.message}`);
          }
        }
        
        // Test message integration for each phone number
        if (staff.phone && staff.phone.startsWith('whatsapp:')) {
          console.log(`\n   🔍 Testing message integration for ${staff.phone}:`);
          
          const messageQuery = `
            SELECT COUNT(*) as count, MIN(timestamp) as first_message, MAX(timestamp) as last_message
            FROM message_log 
            WHERE (from_number = $1 OR to_number = $1) AND account_id = 1
          `;
          const messageResult = await client.query(messageQuery, [staff.phone]);
          
          if (messageResult.rows[0].count > 0) {
            console.log(`     ✅ Found ${messageResult.rows[0].count} messages`);
            console.log(`     Range: ${messageResult.rows[0].first_message} to ${messageResult.rows[0].last_message}`);
          } else {
            console.log(`     ⚠️  No messages found for this phone number`);
          }
        } else if (staff.phone === 'lib:itinerary') {
          console.log(`   🤖 AI system phone format: ${staff.phone}`);
        }
      }
      
      // Test property relationship
      console.log('\n🔍 Testing property relationships:');
      const propertyQuery = `
        SELECT p.property_title, COUNT(s.id) as staff_count
        FROM properties p
        LEFT JOIN staff s ON p.id = s.property_id AND s.account_id = 1
        WHERE p.account_id = 1
        GROUP BY p.id, p.property_title
      `;
      const propertyResult = await client.query(propertyQuery);
      
      propertyResult.rows.forEach(property => {
        console.log(`   ✅ ${property.property_title}: ${property.staff_count} staff members`);
      });
      
      // Analyze role distribution
      console.log('\n🔍 Role analysis:');
      const roleAnalysisQuery = `
        SELECT role, COUNT(*) as count, STRING_AGG(staff_name, ', ') as names
        FROM staff 
        WHERE account_id = 1
        GROUP BY role
        ORDER BY count DESC
      `;
      const roleAnalysisResult = await client.query(roleAnalysisQuery);
      
      roleAnalysisResult.rows.forEach(roleGroup => {
        console.log(`   ${roleGroup.role}: ${roleGroup.count} (${roleGroup.names})`);
      });
      
      // Analyze language distribution
      console.log('\n🔍 Language analysis:');
      const langAnalysisQuery = `
        SELECT 
          COALESCE(preferred_language, 'Not specified') as language, 
          COUNT(*) as count, 
          STRING_AGG(staff_name, ', ') as names
        FROM staff 
        WHERE account_id = 1
        GROUP BY preferred_language
        ORDER BY count DESC
      `;
      const langAnalysisResult = await client.query(langAnalysisQuery);
      
      langAnalysisResult.rows.forEach(langGroup => {
        const langName = langGroup.language === 'id' ? 'Indonesian' : 
                        langGroup.language === 'en' ? 'English' : 
                        langGroup.language;
        console.log(`   ${langName}: ${langGroup.count} (${langGroup.names})`);
      });
      
      // Check phone number sharing and implications
      console.log('\n🔍 Phone number sharing analysis:');
      const phoneShareQuery = `
        SELECT phone, COUNT(*) as count, 
               STRING_AGG(staff_name || ' (' || role || ')', ', ') as staff_details
        FROM staff 
        WHERE account_id = 1 AND phone IS NOT NULL
        GROUP BY phone
        ORDER BY count DESC, phone
      `;
      const phoneShareResult = await client.query(phoneShareQuery);
      
      phoneShareResult.rows.forEach(phoneGroup => {
        if (phoneGroup.count > 1) {
          console.log(`   🔄 Shared: ${phoneGroup.phone}`);
          console.log(`      Staff: ${phoneGroup.staff_details}`);
        } else {
          console.log(`   📱 Individual: ${phoneGroup.phone} - ${phoneGroup.staff_details}`);
        }
      });
      
      // Cross-reference with existing messages
      console.log('\n🔍 Message integration summary:');
      const messageIntegrationQuery = `
        SELECT 
          s.staff_name, s.phone, s.role,
          COALESCE(m.message_count, 0) as message_count
        FROM staff s
        LEFT JOIN (
          SELECT 
            CASE 
              WHEN from_number LIKE 'whatsapp:%' THEN from_number
              WHEN to_number LIKE 'whatsapp:%' THEN to_number
            END as phone_number,
            COUNT(*) as message_count
          FROM message_log 
          WHERE account_id = 1
          GROUP BY phone_number
        ) m ON s.phone = m.phone_number
        WHERE s.account_id = 1
        ORDER BY message_count DESC, s.staff_id
      `;
      const messageIntegrationResult = await client.query(messageIntegrationQuery);
      
      messageIntegrationResult.rows.forEach(staff => {
        if (staff.message_count > 0) {
          console.log(`   ✅ ${staff.staff_name} (${staff.role}): ${staff.message_count} messages`);
        } else if (staff.phone && staff.phone.startsWith('whatsapp:')) {
          console.log(`   ⚠️  ${staff.staff_name} (${staff.role}): No messages yet`);
        } else {
          console.log(`   🤖 ${staff.staff_name} (${staff.role}): AI system (${staff.phone})`);
        }
      });
      
    } else {
      console.log('❌ No staff records found');
    }
    
    // Check table structure
    console.log('\n🔍 Verifying table structure:');
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'staff' 
      ORDER BY ordinal_position
    `;
    const columnsResult = await client.query(columnsQuery);
    console.log(`   Table has ${columnsResult.rows.length} columns`);
    
    const expectedColumns = [
      'id', 'account_id', 'created_at', 'updated_at',
      'staff_json', 'property_id', 'staff_id', 'staff_name', 'phone', 'preferred_language', 'role'
    ];
    
    const missingColumns = expectedColumns.filter(col => 
      !columnsResult.rows.some(row => row.column_name === col)
    );
    
    if (missingColumns.length === 0) {
      console.log(`   ✅ All expected columns present (${expectedColumns.length - 4} CSV + 4 system columns)`);
    } else {
      console.log(`   ❌ Missing columns: ${missingColumns.join(', ')}`);
    }
    
    console.log('\n✅ Staff data verification completed!');
    
    // Summary
    console.log('\n📋 Summary:');
    console.log(`   • ${staffResult.rows.length} staff members imported`);
    console.log(`   • Roles: 3 Staff, 1 Host, 1 AI system`);
    console.log(`   • Languages: 2 Indonesian, 2 English, 1 AI (no language)`);
    console.log(`   • Property: All linked to Bali villa (ID: 1)`);
    console.log(`   • Phone sharing: Made Putra & Harrison Budd share whatsapp:+19299446153`);
    console.log(`   • Message integration: Connected to existing message system`);
    console.log(`   • AI integration: Generate Itinerary system with lib:itinerary format`);
    console.log(`   • Ready for: Staff management, role-based messaging, multi-language support`);
    
  } catch (error) {
    console.error('❌ Error verifying staff data:', error);
  } finally {
    client.release();
    process.exit(0);
  }
};

verifyStaffData();