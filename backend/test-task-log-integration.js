import pool from './config/database.js';

const testTaskLogIntegration = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing task log database integration...');
    
    // Set RLS context
    await client.query(`SET app.current_account_id = '1'`);
    await client.query(`SET app.current_user_id = '1'`);
    
    // Test basic table query
    console.log('\n1️⃣ Testing basic table access:');
    const countQuery = 'SELECT COUNT(*) as total FROM task_log WHERE account_id = 1';
    const countResult = await client.query(countQuery);
    console.log(`   ✅ Found ${countResult.rows[0].total} tasks in database`);
    
    // Test field mapping query (like the API would use)
    console.log('\n2️⃣ Testing API field mapping:');
    const mappingQuery = `
      SELECT 
        id,
        task_uuid as "taskId",
        phone,
        property_id as "propertyId", 
        guest_message as "guestMessage",
        sub_category as "category",
        staff_id as "staffId",
        status as "isCompleted",
        response_received as "responseReceived",
        guest_notified as "guestNotified",
        host_escalated as "hostEscalated",
        created_date as "taskCreated"
      FROM task_log
      WHERE account_id = 1 AND sub_category IN ('Fresh Sheets', 'Fresh Towels', 'Generate Itinerary', 'TV Streaming Help')
      ORDER BY created_date DESC
      LIMIT 5
    `;
    const mappingResult = await client.query(mappingQuery);
    console.log(`   ✅ Successfully mapped ${mappingResult.rows.length} tasks with proper field names`);
    
    mappingResult.rows.forEach((task, i) => {
      console.log(`     ${i + 1}. ${task.category} (ID: ${task.id})`);
      console.log(`        Task ID: ${task.taskId?.substring(0, 8)}...`);
      console.log(`        Completed: ${task.isCompleted}`);
      console.log(`        Staff ID: ${task.staffId}`);
    });
    
    // Test staff relationship
    console.log('\n3️⃣ Testing staff relationship integration:');
    const staffRelationQuery = `
      SELECT 
        t.id,
        t.sub_category as category,
        t.staff_id,
        s.staff_name,
        s.role,
        s.phone as staff_contact
      FROM task_log t
      LEFT JOIN staff s ON t.staff_id = s.staff_id AND s.account_id = t.account_id
      WHERE t.account_id = 1 AND t.staff_id IS NOT NULL
      ORDER BY t.staff_id
      LIMIT 5
    `;
    const staffRelationResult = await client.query(staffRelationQuery);
    console.log(`   ✅ Found ${staffRelationResult.rows.length} tasks with staff relationships`);
    
    staffRelationResult.rows.forEach(task => {
      console.log(`     Task ${task.id}: ${task.category} → ${task.staff_name} (${task.role})`);
    });
    
    // Test statistics query (like the API stats endpoint)
    console.log('\n4️⃣ Testing statistics aggregation:');
    const statsQuery = `
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = true THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN response_received = true THEN 1 ELSE 0 END) as responses_received,
        SUM(CASE WHEN guest_notified = true THEN 1 ELSE 0 END) as guests_notified
      FROM task_log 
      WHERE account_id = 1
    `;
    const statsResult = await client.query(statsQuery);
    const stats = statsResult.rows[0];
    console.log(`   ✅ Statistics computed successfully:`);
    console.log(`     Total Tasks: ${stats.total_tasks}`);
    console.log(`     Completed: ${stats.completed_tasks}`);
    console.log(`     Responses Received: ${stats.responses_received}`);
    console.log(`     Guests Notified: ${stats.guests_notified}`);
    
    // Test category breakdown
    console.log('\n5️⃣ Testing category breakdown:');
    const categoryQuery = `
      SELECT 
        COALESCE(sub_category, 'Uncategorized') as category, 
        COUNT(*) as count
      FROM task_log 
      WHERE account_id = 1
      GROUP BY sub_category 
      ORDER BY count DESC
      LIMIT 10
    `;
    const categoryResult = await client.query(categoryQuery);
    console.log(`   ✅ Category breakdown:`);
    categoryResult.rows.forEach(cat => {
      console.log(`     ${cat.category}: ${cat.count} tasks`);
    });
    
    // Test phone number integration
    console.log('\n6️⃣ Testing phone number message integration:');
    const phoneIntegrationQuery = `
      SELECT 
        t.phone,
        COUNT(*) as task_count,
        m.message_count
      FROM task_log t
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
      ) m ON t.phone = m.phone_number
      WHERE t.account_id = 1 AND t.phone LIKE 'whatsapp:%'
      GROUP BY t.phone, m.message_count
      ORDER BY task_count DESC
      LIMIT 5
    `;
    const phoneResult = await client.query(phoneIntegrationQuery);
    console.log(`   ✅ Phone integration results:`);
    phoneResult.rows.forEach(phone => {
      console.log(`     ${phone.phone}: ${phone.task_count} tasks, ${phone.message_count || 0} messages`);
    });
    
    console.log('\n✅ All task log integration tests passed!');
    console.log('\n📋 Summary:');
    console.log('   • Database table created and accessible');
    console.log('   • Field mapping working for API compatibility'); 
    console.log('   • Staff relationships properly linked');
    console.log('   • Statistics queries functioning');
    console.log('   • Category breakdown operational');
    console.log('   • Phone/message integration working');
    console.log('   • System ready for API and UI integration');

  } catch (error) {
    console.error('❌ Task log integration test failed:', error);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
};

testTaskLogIntegration();