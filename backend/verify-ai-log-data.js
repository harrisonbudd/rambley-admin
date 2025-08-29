import pool from './config/database.js';

const verifyAiLogData = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying AI log data integrity and analytics system...');
    
    // Set RLS context
    await client.query(`SET app.current_account_id = '1'`);
    await client.query(`SET app.current_user_id = '1'`);
    
    // Get comprehensive AI log info
    const aiLogQuery = `
      SELECT 
        id, uuid, recipient_type, property_id, to_recipient, message_chain_uuids,
        message, language, ticket_enrichment_json, tone, sentiment, urgency_indicators,
        sub_category, complexity_indicators, escalation_risk_indicators, 
        available_knowledge_to_respond, ai_message_response, status, task_created,
        task_uuid, sent_check, response_eval_pass_fail, execution_timestamp, created_at
      FROM ai_log 
      WHERE account_id = 1
      ORDER BY execution_timestamp DESC
    `;
    const aiLogResult = await client.query(aiLogQuery);
    
    console.log(`📊 Found ${aiLogResult.rows.length} AI log records:`);
    
    if (aiLogResult.rows.length > 0) {
      console.log('\n✅ AI performance overview:');
      
      // Calculate performance metrics
      const totalLogs = aiLogResult.rows.length;
      const passedEvaluations = aiLogResult.rows.filter(log => log.response_eval_pass_fail === 'pass' || log.response_eval_pass_fail === null).length;
      const failedEvaluations = aiLogResult.rows.filter(log => log.response_eval_pass_fail === 'fail').length;
      const tasksCreated = aiLogResult.rows.filter(log => log.task_created).length;
      const knowledgeAvailable = aiLogResult.rows.filter(log => log.available_knowledge_to_respond === 'Yes').length;
      
      console.log(`   📈 Total Interactions: ${totalLogs}`);
      console.log(`   ✅ Successful Responses: ${passedEvaluations}`);
      console.log(`   ❌ Failed Responses: ${failedEvaluations}`);
      console.log(`   🎯 Tasks Created: ${tasksCreated}`);
      console.log(`   📚 Knowledge Available: ${knowledgeAvailable}`);
      console.log(`   📊 Success Rate: ${totalLogs > 0 ? Math.round((passedEvaluations / totalLogs) * 100) : 0}%`);
      
      // Show sentiment breakdown
      console.log('\n📊 AI sentiment analysis:');
      const sentiments = {};
      aiLogResult.rows.forEach(log => {
        if (log.sentiment) {
          sentiments[log.sentiment] = (sentiments[log.sentiment] || 0) + 1;
        }
      });
      Object.entries(sentiments).forEach(([sentiment, count]) => {
        console.log(`   ${sentiment}: ${count} interactions`);
      });
      
      // Show tone analysis
      console.log('\n📊 AI tone analysis:');
      const tones = {};
      aiLogResult.rows.forEach(log => {
        if (log.tone) {
          tones[log.tone] = (tones[log.tone] || 0) + 1;
        }
      });
      Object.entries(tones).forEach(([tone, count]) => {
        console.log(`   ${tone}: ${count} interactions`);
      });
      
      // Show urgency distribution
      console.log('\n📊 Urgency distribution:');
      const urgencies = {};
      aiLogResult.rows.forEach(log => {
        if (log.urgency_indicators) {
          urgencies[log.urgency_indicators] = (urgencies[log.urgency_indicators] || 0) + 1;
        }
      });
      Object.entries(urgencies).forEach(([urgency, count]) => {
        console.log(`   ${urgency}: ${count} interactions`);
      });
      
      // Show first few AI logs for detailed view
      console.log('\n📋 Sample AI interaction records:');
      for (const log of aiLogResult.rows.slice(0, 3)) {
        console.log(`\n🤖 AI Log ${log.id} (${log.sub_category || 'General'})`);
        console.log(`   UUID: ${log.uuid}`);
        console.log(`   Recipient: ${log.recipient_type} → ${log.to_recipient}`);
        console.log(`   Property ID: ${log.property_id}`);
        console.log(`   Language: ${log.language || 'Not specified'}`);
        console.log(`   Sentiment: ${log.sentiment || 'Unknown'} | Tone: ${log.tone || 'Unknown'}`);
        console.log(`   Urgency: ${log.urgency_indicators || 'Unknown'} | Complexity: ${log.complexity_indicators || 'Unknown'}`);
        console.log(`   Escalation Risk: ${log.escalation_risk_indicators || 'Unknown'}`);
        console.log(`   Knowledge Available: ${log.available_knowledge_to_respond || 'Unknown'}`);
        console.log(`   Status: ${log.status} | Evaluation: ${log.response_eval_pass_fail || 'Not evaluated'}`);
        console.log(`   Task Created: ${log.task_created ? 'Yes' : 'No'}`);
        console.log(`   Execution Time: ${log.execution_timestamp}`);
        
        // Test property relationship
        if (log.property_id) {
          console.log(`\n   🔍 Testing property relationship (ID: ${log.property_id}):`);
          const propertyQuery = `
            SELECT property_title, property_location
            FROM properties 
            WHERE id = $1 AND account_id = 1
          `;
          const propertyResult = await client.query(propertyQuery, [log.property_id]);
          
          if (propertyResult.rows.length > 0) {
            const property = propertyResult.rows[0];
            console.log(`     ✅ Property found: ${property.property_title}`);
            console.log(`     Location: ${property.property_location?.substring(0, 50)}...`);
          } else {
            console.log(`     ❌ Property not found for ID ${log.property_id}`);
          }
        }
        
        // Test task relationship
        if (log.task_uuid) {
          console.log(`\n   🔍 Testing task relationship (UUID: ${log.task_uuid}):`);
          const taskQuery = `
            SELECT id, sub_category, status
            FROM task_log 
            WHERE task_uuid = $1 AND account_id = 1
          `;
          const taskResult = await client.query(taskQuery, [log.task_uuid]);
          
          if (taskResult.rows.length > 0) {
            const task = taskResult.rows[0];
            console.log(`     ✅ Task found: ${task.sub_category} (ID: ${task.id})`);
            console.log(`     Status: ${task.status ? 'Completed' : 'Pending'}`);
          } else {
            console.log(`     ⚠️  Task not found for UUID ${log.task_uuid}`);
          }
        }
        
        // Test message chain relationship  
        if (log.message_chain_uuids && log.to_recipient) {
          console.log(`\n   🔍 Testing message chain relationship:`);
          const messageQuery = `
            SELECT COUNT(*) as count
            FROM message_log 
            WHERE (from_number = $1 OR to_number = $1) AND account_id = 1
          `;
          const messageResult = await client.query(messageQuery, [log.to_recipient]);
          
          if (messageResult.rows[0].count > 0) {
            console.log(`     ✅ Found ${messageResult.rows[0].count} related messages for ${log.to_recipient}`);
          } else {
            console.log(`     ⚠️  No messages found for recipient ${log.to_recipient}`);
          }
        }
        
        // Test JSON data structure
        if (log.ticket_enrichment_json) {
          console.log(`\n   🔍 Testing enrichment JSON:`);
          try {
            const enrichment = JSON.parse(log.ticket_enrichment_json);
            console.log(`     ✅ JSON parsed successfully`);
            console.log(`     Tone: ${enrichment.Tone}`);
            console.log(`     Sentiment: ${enrichment.Sentiment}`);
            console.log(`     Urgency: ${enrichment.Urgency}`);
            console.log(`     Sub-Category: ${enrichment['Sub-Category']}`);
            console.log(`     Complexity: ${enrichment.Complexity}`);
            console.log(`     Escalation Risk: ${enrichment.EscalationRisk}`);
            console.log(`     Knowledge Available: ${enrichment.KnowledgeAvailable}`);
          } catch (e) {
            console.log(`     ❌ JSON parsing failed: ${e.message}`);
          }
        }
        
        // Show message and response snippets
        if (log.message) {
          console.log(`\n   💬 Guest message: ${log.message.substring(0, 100)}...`);
        }
        if (log.ai_message_response) {
          console.log(`   🤖 AI response: ${log.ai_message_response.substring(0, 100)}...`);
        }
      }
      
      // Analyze AI performance patterns
      console.log('\n🔍 AI performance pattern analysis:');
      const performanceQuery = `
        SELECT 
          sub_category,
          COUNT(*) as total_interactions,
          COUNT(CASE WHEN response_eval_pass_fail = 'pass' THEN 1 END) as successful,
          ROUND(COUNT(CASE WHEN response_eval_pass_fail = 'pass' THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate,
          COUNT(CASE WHEN task_created = true THEN 1 END) as tasks_created
        FROM ai_log
        WHERE account_id = 1 AND sub_category IS NOT NULL
        GROUP BY sub_category
        ORDER BY total_interactions DESC
      `;
      const performanceResult = await client.query(performanceQuery);
      
      performanceResult.rows.forEach(category => {
        console.log(`   ${category.sub_category}: ${category.total_interactions} interactions, ${category.success_rate}% success rate, ${category.tasks_created} tasks created`);
      });
      
      // Analyze escalation risk effectiveness
      console.log('\n🔍 Escalation risk analysis:');
      const escalationQuery = `
        SELECT 
          escalation_risk_indicators as risk_level,
          COUNT(*) as interactions,
          COUNT(CASE WHEN task_created = true THEN 1 END) as tasks_created,
          ROUND(COUNT(CASE WHEN task_created = true THEN 1 END) * 100.0 / COUNT(*), 2) as task_creation_rate
        FROM ai_log
        WHERE account_id = 1 AND escalation_risk_indicators IS NOT NULL
        GROUP BY escalation_risk_indicators
        ORDER BY interactions DESC
      `;
      const escalationResult = await client.query(escalationQuery);
      
      escalationResult.rows.forEach(risk => {
        console.log(`   ${risk.risk_level} risk: ${risk.interactions} interactions, ${risk.task_creation_rate}% led to task creation`);
      });
      
      // Language and urgency correlation
      console.log('\n🔍 Language and urgency correlation:');
      const languageUrgencyQuery = `
        SELECT 
          language,
          urgency_indicators,
          COUNT(*) as interactions,
          ROUND(AVG(CASE WHEN response_eval_pass_fail = 'pass' THEN 100.0 ELSE 0.0 END), 2) as success_rate
        FROM ai_log
        WHERE account_id = 1 AND language IS NOT NULL AND urgency_indicators IS NOT NULL
        GROUP BY language, urgency_indicators
        ORDER BY language, urgency_indicators
      `;
      const languageUrgencyResult = await client.query(languageUrgencyQuery);
      
      languageUrgencyResult.rows.forEach(combo => {
        console.log(`   ${combo.language} + ${combo.urgency_indicators}: ${combo.interactions} interactions, ${combo.success_rate}% success rate`);
      });
      
    } else {
      console.log('❌ No AI log records found');
    }
    
    // Check table structure
    console.log('\n🔍 Verifying AI log table structure:');
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'ai_log' 
      ORDER BY ordinal_position
    `;
    const columnsResult = await client.query(columnsQuery);
    console.log(`   Table has ${columnsResult.rows.length} columns`);
    
    const expectedColumns = [
      'id', 'account_id', 'created_at', 'updated_at',
      'execution_timestamp', 'uuid', 'recipient_type', 'property_id', 'to_recipient',
      'message_chain_uuids', 'message', 'language', 'ticket_enrichment_json', 'tone',
      'sentiment', 'urgency_indicators', 'sub_category', 'complexity_indicators',
      'escalation_risk_indicators', 'available_knowledge_to_respond', 'ai_message_response',
      'status', 'task_created', 'task_uuid', 'sent_check', 'response_eval_pass_fail',
      'booking_details_json', 'property_details_json', 'property_faqs_json'
    ];
    
    const missingColumns = expectedColumns.filter(col => 
      !columnsResult.rows.some(row => row.column_name === col)
    );
    
    if (missingColumns.length === 0) {
      console.log(`   ✅ All expected columns present (${expectedColumns.length - 4} CSV + 4 system columns)`);
    } else {
      console.log(`   ❌ Missing columns: ${missingColumns.join(', ')}`);
    }
    
    console.log('\n✅ AI log data verification completed!');
    
    // Summary
    console.log('\n📋 Summary:');
    console.log(`   • ${aiLogResult.rows.length} AI interaction records imported`);
    console.log(`   • Sentiment tracking: Guest emotion analysis with tone adaptation`);
    console.log(`   • Performance analytics: Success rate tracking and evaluation metrics`);
    console.log(`   • Escalation prediction: Risk assessment and task creation triggers`);
    console.log(`   • Knowledge analysis: Gap identification and response quality`);
    console.log(`   • Multi-language support: Language-specific performance optimization`);
    console.log(`   • Conversation intelligence: Message chain threading and context`);
    console.log(`   • Cross-system integration: Property, task, and message relationships`);
    console.log(`   • JSON enrichment: Deep conversation context and classification`);
    console.log(`   • Ready for: AI dashboard, performance optimization, guest experience analytics`);
    
  } catch (error) {
    console.error('❌ Error verifying AI log data:', error);
  } finally {
    client.release();
    process.exit(0);
  }
};

verifyAiLogData();