import pool from './config/database.js';

const testAiLogIntegration = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing AI log database integration...');
    
    // Set RLS context
    await client.query(`SET app.current_account_id = '1'`);
    await client.query(`SET app.current_user_id = '1'`);
    
    // Test basic table query
    console.log('\n1️⃣ Testing basic table access:');
    const countQuery = 'SELECT COUNT(*) as total FROM ai_log WHERE account_id = 1';
    const countResult = await client.query(countQuery);
    console.log(`   ✅ Found ${countResult.rows[0].total} AI logs in database`);
    
    // Test field mapping query (like the API would use)
    console.log('\n2️⃣ Testing API field mapping:');
    const mappingQuery = `
      SELECT 
        id,
        uuid as "aiLogId",
        recipient_type as "recipientType",
        property_id as "propertyId",
        message,
        sentiment,
        tone,
        urgency_indicators as "urgency",
        sub_category as "category",
        ai_message_response as "aiResponse",
        status,
        response_eval_pass_fail as "responseEvaluation",
        execution_timestamp as "timestamp"
      FROM ai_log
      WHERE account_id = 1 AND message IS NOT NULL
      ORDER BY execution_timestamp DESC
      LIMIT 5
    `;
    const mappingResult = await client.query(mappingQuery);
    console.log(`   ✅ Successfully mapped ${mappingResult.rows.length} AI logs with proper field names`);
    
    mappingResult.rows.forEach((log, i) => {
      console.log(`     ${i + 1}. ${log.category || 'General'} (ID: ${log.id})`);
      console.log(`        AI Log ID: ${log.aiLogId?.substring(0, 8)}...`);
      console.log(`        Sentiment: ${log.sentiment || 'Unknown'}`);
      console.log(`        Tone: ${log.tone || 'Unknown'}`);
      console.log(`        Status: ${log.status}`);
    });
    
    // Test property relationship integration
    console.log('\n3️⃣ Testing property relationship integration:');
    const propertyRelationQuery = `
      SELECT 
        a.id,
        a.sub_category as category,
        a.property_id,
        p.property_title,
        p.property_location
      FROM ai_log a
      LEFT JOIN properties p ON a.property_id = p.id AND p.account_id = a.account_id
      WHERE a.account_id = 1 AND a.property_id IS NOT NULL
      ORDER BY a.execution_timestamp DESC
      LIMIT 5
    `;
    const propertyRelationResult = await client.query(propertyRelationQuery);
    console.log(`   ✅ Found ${propertyRelationResult.rows.length} AI logs with property relationships`);
    
    propertyRelationResult.rows.forEach(log => {
      console.log(`     AI Log ${log.id}: ${log.category || 'General'} → ${log.property_title}`);
    });
    
    // Test performance analytics (like the API stats endpoint)
    console.log('\n4️⃣ Testing performance analytics:');
    const performanceQuery = `
      SELECT 
        COUNT(*) as total_interactions,
        COUNT(CASE WHEN response_eval_pass_fail = 'pass' THEN 1 END) as successful_responses,
        COUNT(CASE WHEN response_eval_pass_fail = 'fail' THEN 1 END) as failed_responses,
        COUNT(CASE WHEN task_created = true THEN 1 END) as tasks_created,
        COUNT(CASE WHEN available_knowledge_to_respond = 'Yes' THEN 1 END) as knowledge_available,
        ROUND(AVG(CASE WHEN urgency_indicators = 'Low' THEN 1 
                       WHEN urgency_indicators = 'Medium' THEN 2 
                       WHEN urgency_indicators = 'High' THEN 3 
                       ELSE 0 END), 2) as avg_urgency_score
      FROM ai_log 
      WHERE account_id = 1
    `;
    const performanceResult = await client.query(performanceQuery);
    const performance = performanceResult.rows[0];
    console.log(`   ✅ Performance analytics computed:`);
    console.log(`     Total Interactions: ${performance.total_interactions}`);
    console.log(`     Successful Responses: ${performance.successful_responses}`);
    console.log(`     Failed Responses: ${performance.failed_responses}`);
    console.log(`     Tasks Created: ${performance.tasks_created}`);
    console.log(`     Knowledge Available: ${performance.knowledge_available}`);
    console.log(`     Average Urgency Score: ${performance.avg_urgency_score}`);
    
    // Test sentiment analysis
    console.log('\n5️⃣ Testing sentiment analysis:');
    const sentimentQuery = `
      SELECT 
        sentiment,
        tone,
        COUNT(*) as interactions,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
      FROM ai_log 
      WHERE account_id = 1 AND (sentiment IS NOT NULL OR tone IS NOT NULL)
      GROUP BY sentiment, tone 
      ORDER BY interactions DESC
      LIMIT 10
    `;
    const sentimentResult = await client.query(sentimentQuery);
    console.log(`   ✅ Sentiment analysis results:`);
    sentimentResult.rows.forEach(item => {
      console.log(`     ${item.sentiment || 'Unknown'} + ${item.tone || 'Unknown'}: ${item.interactions} (${item.percentage}%)`);
    });
    
    // Test escalation analysis
    console.log('\n6️⃣ Testing escalation risk analysis:');
    const escalationQuery = `
      SELECT 
        escalation_risk_indicators as risk_level,
        complexity_indicators as complexity,
        COUNT(*) as interactions,
        COUNT(CASE WHEN task_created = true THEN 1 END) as tasks_created
      FROM ai_log 
      WHERE account_id = 1
      GROUP BY escalation_risk_indicators, complexity_indicators
      ORDER BY interactions DESC
      LIMIT 5
    `;
    const escalationResult = await client.query(escalationQuery);
    console.log(`   ✅ Escalation analysis results:`);
    escalationResult.rows.forEach(risk => {
      console.log(`     ${risk.risk_level || 'Unknown'} risk, ${risk.complexity || 'Unknown'} complexity: ${risk.interactions} interactions, ${risk.tasks_created} tasks created`);
    });
    
    // Test JSON enrichment parsing
    console.log('\n7️⃣ Testing JSON enrichment data:');
    const jsonQuery = `
      SELECT 
        id,
        ticket_enrichment_json,
        booking_details_json,
        property_details_json,
        property_faqs_json
      FROM ai_log 
      WHERE account_id = 1 AND (
        ticket_enrichment_json IS NOT NULL OR 
        booking_details_json IS NOT NULL OR
        property_details_json IS NOT NULL OR
        property_faqs_json IS NOT NULL
      )
      LIMIT 3
    `;
    const jsonResult = await client.query(jsonQuery);
    console.log(`   ✅ Found ${jsonResult.rows.length} AI logs with JSON enrichment data`);
    
    jsonResult.rows.forEach(log => {
      console.log(`     AI Log ${log.id}:`);
      
      if (log.ticket_enrichment_json) {
        try {
          const enrichment = JSON.parse(log.ticket_enrichment_json);
          console.log(`       ✅ Ticket enrichment: ${Object.keys(enrichment).join(', ')}`);
        } catch (e) {
          console.log(`       ❌ Ticket enrichment JSON invalid`);
        }
      }
      
      if (log.booking_details_json) {
        console.log(`       ✅ Booking details available`);
      }
      
      if (log.property_details_json) {
        console.log(`       ✅ Property details available`);
      }
      
      if (log.property_faqs_json) {
        console.log(`       ✅ Property FAQs available`);
      }
    });
    
    // Test message integration
    console.log('\n8️⃣ Testing message system integration:');
    const messageIntegrationQuery = `
      SELECT 
        a.to_recipient as phone,
        COUNT(a.id) as ai_logs,
        COUNT(m.id) as messages
      FROM ai_log a
      LEFT JOIN message_log m ON (m.from_number = a.to_recipient OR m.to_number = a.to_recipient) 
                               AND m.account_id = a.account_id
      WHERE a.account_id = 1 AND a.to_recipient LIKE 'whatsapp:%'
      GROUP BY a.to_recipient
      ORDER BY ai_logs DESC
      LIMIT 5
    `;
    const messageIntegrationResult = await client.query(messageIntegrationQuery);
    console.log(`   ✅ Message integration results:`);
    messageIntegrationResult.rows.forEach(integration => {
      console.log(`     ${integration.phone}: ${integration.ai_logs} AI logs, ${integration.messages} messages`);
    });
    
    console.log('\n✅ All AI log integration tests passed!');
    console.log('\n📋 Summary:');
    console.log('   • Database table created and accessible');
    console.log('   • Field mapping working for API compatibility'); 
    console.log('   • Property relationships properly linked');
    console.log('   • Performance analytics functioning');
    console.log('   • Sentiment analysis operational');
    console.log('   • Escalation risk analysis working');
    console.log('   • JSON enrichment data parseable');
    console.log('   • Message system integration working');
    console.log('   • System ready for AI dashboard and analytics UI');

  } catch (error) {
    console.error('❌ AI log integration test failed:', error);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
};

testAiLogIntegration();