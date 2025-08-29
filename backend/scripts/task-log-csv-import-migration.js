import pool from '../config/database.js';
import fs from 'fs';

const importTaskLogFromCSV = async () => {
  try {
    console.log('🔄 Starting task log CSV import migration...');

    // Read and parse the CSV file
    const csvPath = '/Users/harrisonbudd/Downloads/AI Villa Assistant - d_taskLog.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    // Get header and data lines
    const headerLine = lines[0];
    const dataLines = lines.slice(1).filter(line => line.trim() !== '');
    
    console.log(`📊 Found ${dataLines.length} task log records to import`);

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
        return val.toLowerCase() === 'true' || val === '1';
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

    // Drop existing task_log table and create new one
    console.log('🗑️ Dropping existing task_log table if exists...');
    await pool.query('DROP TABLE IF EXISTS task_log CASCADE');

    console.log('🏗️ Creating new task_log table with CSV schema...');
    await pool.query(`
      CREATE TABLE task_log (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- CSV Fields with exact header mapping (18 meaningful columns)
        created_date TIMESTAMP,
        task_uuid TEXT,
        phone TEXT,
        property_id INTEGER,
        guest_message TEXT,
        sub_category TEXT,
        staff_id INTEGER,
        staff_details_json TEXT,
        staff_phone TEXT,
        requirements_to_complete_task TEXT,
        ai_message_response TEXT,
        status BOOLEAN DEFAULT false,
        escalated_to_host TEXT,
        uuids TEXT,
        ongoing_conversation TEXT,
        response_received BOOLEAN DEFAULT false,
        guest_notified BOOLEAN DEFAULT false,
        host_escalated BOOLEAN DEFAULT false
      )
    `);

    console.log('📝 Inserting task log data...');
    
    let insertedCount = 0;
    
    for (const dataLine of dataLines) {
      const values = parseCSVLine(dataLine);
      
      // Skip empty rows
      if (values.every(val => val === null || val === '')) {
        continue;
      }
      
      console.log(`📋 Processing task record with ${values.length} values`);
      
      // Map CSV values to database fields (18 meaningful fields, excluding 4 empty columns)
      const taskData = {
        created_date: parseTimestamp(values[0]),
        task_uuid: values[1] || null,
        phone: values[2] || null,
        property_id: parseInteger(values[3]),
        guest_message: values[4] || null,
        sub_category: values[5] || null,
        staff_id: parseInteger(values[6]),
        staff_details_json: values[7] || null,
        staff_phone: values[8] || null,
        requirements_to_complete_task: values[9] || null,
        ai_message_response: values[10] || null,
        status: parseBoolean(values[11]),
        escalated_to_host: values[12] || null,
        uuids: values[13] || null,
        ongoing_conversation: values[14] || null,
        response_received: parseBoolean(values[15]),
        guest_notified: parseBoolean(values[16]),
        host_escalated: parseBoolean(values[17])
        // Skip values[18], [19], [20], [21] as they are empty columns
      };

      // Only insert if there's meaningful task data
      if (taskData.task_uuid || taskData.guest_message || taskData.sub_category) {
        
        const insertQuery = `
          INSERT INTO task_log (
            account_id, created_date, task_uuid, phone, property_id, guest_message,
            sub_category, staff_id, staff_details_json, staff_phone, requirements_to_complete_task,
            ai_message_response, status, escalated_to_host, uuids, ongoing_conversation,
            response_received, guest_notified, host_escalated
          ) VALUES (
            1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
          ) RETURNING id, task_uuid, sub_category, phone, staff_id
        `;

        const insertValues = [
          taskData.created_date, taskData.task_uuid, taskData.phone, taskData.property_id,
          taskData.guest_message, taskData.sub_category, taskData.staff_id, taskData.staff_details_json,
          taskData.staff_phone, taskData.requirements_to_complete_task, taskData.ai_message_response,
          taskData.status, taskData.escalated_to_host, taskData.uuids, taskData.ongoing_conversation,
          taskData.response_received, taskData.guest_notified, taskData.host_escalated
        ];

        const result = await pool.query(insertQuery, insertValues);
        const insertedTask = result.rows[0];
        
        console.log(`✅ Inserted task ID ${insertedTask.id}: ${insertedTask.sub_category} (UUID: ${insertedTask.task_uuid?.substring(0, 8)}...)`);
        insertedCount++;
      }
    }

    console.log('✅ Task log CSV import completed successfully!');
    console.log(`📊 Total tasks imported: ${insertedCount}`);

    // Verify the import
    const verifyQuery = 'SELECT COUNT(*) as count FROM task_log WHERE account_id = 1';
    const verifyResult = await pool.query(verifyQuery);
    console.log(`📈 Total tasks in database: ${verifyResult.rows[0].count}`);

    // Show sample of imported data
    const sampleQuery = `
      SELECT id, task_uuid, sub_category, phone, staff_id, status, 
             response_received, guest_notified, created_date
      FROM task_log 
      WHERE account_id = 1 
      ORDER BY created_date DESC
      LIMIT 5
    `;
    const sampleResult = await pool.query(sampleQuery);
    
    console.log('\n📋 Sample imported tasks:');
    sampleResult.rows.forEach((task, i) => {
      console.log(`  ${i + 1}. ${task.sub_category} (UUID: ${task.task_uuid?.substring(0, 8)}...)`);
      console.log(`     Phone: ${task.phone}`);
      console.log(`     Staff ID: ${task.staff_id}`);
      console.log(`     Status: ${task.status ? 'Complete' : 'Pending'}`);
      console.log(`     Response Received: ${task.response_received}`);
      console.log(`     Guest Notified: ${task.guest_notified}`);
      console.log(`     Created: ${task.created_date}`);
      console.log('     ---');
    });

    // Check for interesting patterns
    console.log('\n🔍 Data analysis:');
    
    // Count by sub-category
    const categoryQuery = `
      SELECT sub_category, COUNT(*) as count 
      FROM task_log 
      WHERE account_id = 1 
      GROUP BY sub_category 
      ORDER BY count DESC
    `;
    const categoryResult = await pool.query(categoryQuery);
    console.log('📊 Tasks by category:');
    categoryResult.rows.forEach(row => {
      console.log(`   ${row.sub_category}: ${row.count}`);
    });
    
    // Count by staff assignment
    const staffQuery = `
      SELECT staff_id, COUNT(*) as count 
      FROM task_log 
      WHERE account_id = 1 AND staff_id IS NOT NULL
      GROUP BY staff_id 
      ORDER BY count DESC
    `;
    const staffResult = await pool.query(staffQuery);
    console.log('📊 Tasks by staff ID:');
    staffResult.rows.forEach(row => {
      console.log(`   Staff ID ${row.staff_id}: ${row.count} tasks`);
    });
    
    // Count completion status
    const statusQuery = `
      SELECT 
        SUM(CASE WHEN status = true THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = false THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN response_received = true THEN 1 ELSE 0 END) as responses_received,
        SUM(CASE WHEN guest_notified = true THEN 1 ELSE 0 END) as guests_notified
      FROM task_log 
      WHERE account_id = 1
    `;
    const statusResult = await pool.query(statusQuery);
    console.log('📊 Task completion status:');
    const stats = statusResult.rows[0];
    console.log(`   Completed: ${stats.completed}`);
    console.log(`   Pending: ${stats.pending}`);
    console.log(`   Responses Received: ${stats.responses_received}`);
    console.log(`   Guests Notified: ${stats.guests_notified}`);

    return { count: insertedCount };

  } catch (error) {
    console.error('💥 Task log CSV import failed:', error);
    throw error;
  }
};

export { importTaskLogFromCSV };

// If running this script directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importTaskLogFromCSV()
    .then((result) => {
      console.log(`✅ Migration completed successfully - ${result.count} tasks imported`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}