import pool from '../config/database.js';
import fs from 'fs';

const importAiLogFromCSV = async () => {
  try {
    console.log('🔄 Starting AI log CSV import migration...');

    // Read and parse the CSV file
    const csvPath = '/Users/harrisonbudd/Downloads/AI Villa Assistant - d_aiLog.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    // Get header and data lines
    const headerLine = lines[0];
    const dataLines = lines.slice(1).filter(line => line.trim() !== '');
    
    console.log(`📊 Found ${dataLines.length} AI log records to import`);

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
        } else if (char === '[' && inQuotes) {
          bracketDepth++;
          current += char;
        } else if (char === ']' && inQuotes) {
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

    const parseBoolean = (val) => {
      if (val === null || val === '' || val === undefined) return false;
      if (typeof val === 'string') {
        return val.toLowerCase() === 'true' || val === '1' || val.toLowerCase() === 'pass';
      }
      return Boolean(val);
    };

    const parseTimestamp = (val) => {
      if (val === null || val === '' || val === undefined) return null;
      try {
        // Handle MM/DD/YYYY HH:MM:SS format
        if (val.includes('/')) {
          const date = new Date(val);
          return date.toISOString();
        }
        // Handle other formats
        const date = new Date(val);
        return date.toISOString();
      } catch (e) {
        return null;
      }
    };

    // Drop existing ai_log table and create new one
    console.log('🗑️ Dropping existing ai_log table if exists...');
    await pool.query('DROP TABLE IF EXISTS ai_log CASCADE');

    console.log('🏗️ Creating new ai_log table with CSV schema...');
    await pool.query(`
      CREATE TABLE ai_log (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- CSV Fields with exact header mapping (25 columns)
        execution_timestamp TIMESTAMP,
        uuid TEXT,
        recipient_type TEXT,
        property_id INTEGER,
        to_recipient TEXT,
        message_chain_uuids TEXT,
        message TEXT,
        language TEXT,
        ticket_enrichment_json TEXT,
        tone TEXT,
        sentiment TEXT,
        urgency_indicators TEXT,
        sub_category TEXT,
        complexity_indicators TEXT,
        escalation_risk_indicators TEXT,
        available_knowledge_to_respond TEXT,
        ai_message_response TEXT,
        status TEXT,
        task_created BOOLEAN DEFAULT false,
        task_uuid TEXT,
        sent_check INTEGER,
        response_eval_pass_fail TEXT,
        booking_details_json TEXT,
        property_details_json TEXT,
        property_faqs_json TEXT
      )
    `);

    console.log('📝 Inserting AI log data...');
    
    let insertedCount = 0;
    
    for (const dataLine of dataLines) {
      const values = parseCSVLine(dataLine);
      
      // Skip empty rows
      if (values.every(val => val === null || val === '')) {
        continue;
      }
      
      console.log(`📋 Processing AI log record with ${values.length} values`);
      
      // Map CSV values to database fields (25 fields total)
      const aiLogData = {
        execution_timestamp: parseTimestamp(values[0]),
        uuid: values[1] || null,
        recipient_type: values[2] || null,
        property_id: parseInteger(values[3]),
        to_recipient: values[4] || null,
        message_chain_uuids: values[5] || null,
        message: values[6] || null,
        language: values[7] || null,
        ticket_enrichment_json: values[8] || null,
        tone: values[9] || null,
        sentiment: values[10] || null,
        urgency_indicators: values[11] || null,
        sub_category: values[12] || null,
        complexity_indicators: values[13] || null,
        escalation_risk_indicators: values[14] || null,
        available_knowledge_to_respond: values[15] || null,
        ai_message_response: values[16] || null,
        status: values[17] || null,
        task_created: parseBoolean(values[18]),
        task_uuid: values[19] || null,
        sent_check: parseInteger(values[20]),
        response_eval_pass_fail: values[21] || null,
        booking_details_json: values[22] || null,
        property_details_json: values[23] || null,
        property_faqs_json: values[24] || null
      };

      // Only insert if there's meaningful AI log data
      if (aiLogData.uuid || aiLogData.message || aiLogData.ai_message_response) {
        
        const insertQuery = `
          INSERT INTO ai_log (
            account_id, execution_timestamp, uuid, recipient_type, property_id, to_recipient,
            message_chain_uuids, message, language, ticket_enrichment_json, tone, sentiment,
            urgency_indicators, sub_category, complexity_indicators, escalation_risk_indicators,
            available_knowledge_to_respond, ai_message_response, status, task_created, task_uuid,
            sent_check, response_eval_pass_fail, booking_details_json, property_details_json, property_faqs_json
          ) VALUES (
            1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
          ) RETURNING id, uuid, message, status, sentiment, tone
        `;

        const insertValues = [
          aiLogData.execution_timestamp, aiLogData.uuid, aiLogData.recipient_type, aiLogData.property_id,
          aiLogData.to_recipient, aiLogData.message_chain_uuids, aiLogData.message, aiLogData.language,
          aiLogData.ticket_enrichment_json, aiLogData.tone, aiLogData.sentiment, aiLogData.urgency_indicators,
          aiLogData.sub_category, aiLogData.complexity_indicators, aiLogData.escalation_risk_indicators,
          aiLogData.available_knowledge_to_respond, aiLogData.ai_message_response, aiLogData.status,
          aiLogData.task_created, aiLogData.task_uuid, aiLogData.sent_check, aiLogData.response_eval_pass_fail,
          aiLogData.booking_details_json, aiLogData.property_details_json, aiLogData.property_faqs_json
        ];

        const result = await pool.query(insertQuery, insertValues);
        const insertedLog = result.rows[0];
        
        console.log(`✅ Inserted AI log ID ${insertedLog.id}: ${insertedLog.sentiment || 'Unknown'} sentiment (UUID: ${insertedLog.uuid?.substring(0, 8)}...)`);
        insertedCount++;
      }
    }

    console.log('✅ AI log CSV import completed successfully!');
    console.log(`📊 Total AI logs imported: ${insertedCount}`);

    // Verify the import
    const verifyQuery = 'SELECT COUNT(*) as count FROM ai_log WHERE account_id = 1';
    const verifyResult = await pool.query(verifyQuery);
    console.log(`📈 Total AI logs in database: ${verifyResult.rows[0].count}`);

    // Show sample of imported data
    const sampleQuery = `
      SELECT id, uuid, recipient_type, message, sentiment, tone, urgency_indicators,
             sub_category, status, execution_timestamp
      FROM ai_log 
      WHERE account_id = 1 
      ORDER BY execution_timestamp DESC
      LIMIT 5
    `;
    const sampleResult = await pool.query(sampleQuery);
    
    console.log('\n📋 Sample imported AI logs:');
    sampleResult.rows.forEach((log, i) => {
      console.log(`  ${i + 1}. ${log.sub_category || 'General'} (ID: ${log.id})`);
      console.log(`     UUID: ${log.uuid?.substring(0, 8)}...`);
      console.log(`     Recipient: ${log.recipient_type}`);
      console.log(`     Sentiment: ${log.sentiment || 'Unknown'}`);
      console.log(`     Tone: ${log.tone || 'Unknown'}`);
      console.log(`     Urgency: ${log.urgency_indicators || 'Unknown'}`);
      console.log(`     Status: ${log.status}`);
      console.log(`     Message: ${log.message?.substring(0, 60)}...`);
      console.log(`     Time: ${log.execution_timestamp}`);
      console.log('     ---');
    });

    // Check for interesting patterns
    console.log('\n🔍 AI performance analysis:');
    
    // Count by sentiment
    const sentimentQuery = `
      SELECT sentiment, COUNT(*) as count 
      FROM ai_log 
      WHERE account_id = 1 
      GROUP BY sentiment 
      ORDER BY count DESC
    `;
    const sentimentResult = await pool.query(sentimentQuery);
    console.log('📊 AI interactions by sentiment:');
    sentimentResult.rows.forEach(row => {
      console.log(`   ${row.sentiment || 'Unknown'}: ${row.count}`);
    });
    
    // Count by tone
    const toneQuery = `
      SELECT tone, COUNT(*) as count 
      FROM ai_log 
      WHERE account_id = 1 
      GROUP BY tone 
      ORDER BY count DESC
    `;
    const toneResult = await pool.query(toneQuery);
    console.log('📊 AI interactions by tone:');
    toneResult.rows.forEach(row => {
      console.log(`   ${row.tone || 'Unknown'}: ${row.count}`);
    });
    
    // Count by urgency
    const urgencyQuery = `
      SELECT urgency_indicators, COUNT(*) as count 
      FROM ai_log 
      WHERE account_id = 1 
      GROUP BY urgency_indicators 
      ORDER BY count DESC
    `;
    const urgencyResult = await pool.query(urgencyQuery);
    console.log('📊 AI interactions by urgency:');
    urgencyResult.rows.forEach(row => {
      console.log(`   ${row.urgency_indicators || 'Unknown'}: ${row.count}`);
    });
    
    // Count by status
    const statusQuery = `
      SELECT status, COUNT(*) as count 
      FROM ai_log 
      WHERE account_id = 1 
      GROUP BY status 
      ORDER BY count DESC
    `;
    const statusResult = await pool.query(statusQuery);
    console.log('📊 AI interactions by status:');
    statusResult.rows.forEach(row => {
      console.log(`   ${row.status || 'Unknown'}: ${row.count}`);
    });
    
    // Check response evaluation
    const evalQuery = `
      SELECT 
        response_eval_pass_fail, 
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
      FROM ai_log 
      WHERE account_id = 1 AND response_eval_pass_fail IS NOT NULL
      GROUP BY response_eval_pass_fail 
      ORDER BY count DESC
    `;
    const evalResult = await pool.query(evalQuery);
    console.log('📊 AI response evaluation:');
    evalResult.rows.forEach(row => {
      console.log(`   ${row.response_eval_pass_fail}: ${row.count} (${row.percentage}%)`);
    });

    // Analyze JSON enrichment data
    const enrichmentQuery = `
      SELECT COUNT(*) as total,
             COUNT(ticket_enrichment_json) as with_enrichment,
             COUNT(booking_details_json) as with_booking_details,
             COUNT(property_details_json) as with_property_details,
             COUNT(property_faqs_json) as with_faqs
      FROM ai_log 
      WHERE account_id = 1
    `;
    const enrichmentResult = await pool.query(enrichmentQuery);
    const enrichment = enrichmentResult.rows[0];
    console.log('📊 Data enrichment analysis:');
    console.log(`   Total logs: ${enrichment.total}`);
    console.log(`   With enrichment data: ${enrichment.with_enrichment}`);
    console.log(`   With booking details: ${enrichment.with_booking_details}`);
    console.log(`   With property details: ${enrichment.with_property_details}`);
    console.log(`   With FAQ data: ${enrichment.with_faqs}`);

    return { count: insertedCount };

  } catch (error) {
    console.error('💥 AI log CSV import failed:', error);
    throw error;
  }
};

export { importAiLogFromCSV };

// If running this script directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importAiLogFromCSV()
    .then((result) => {
      console.log(`✅ Migration completed successfully - ${result.count} AI logs imported`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}