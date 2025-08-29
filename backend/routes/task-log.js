import express from 'express';
import { validationResult, body, query } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { setAccountContext } from '../middleware/setAccountContext.js';

const router = express.Router();

// Apply authentication and account context to all routes
router.use(authenticateToken);
router.use(setAccountContext);

// Validation rules
const taskLogValidation = [
  body('task_uuid').optional().trim(),
  body('phone').optional().trim(),
  body('property_id').optional().isInt({ min: 1 }).withMessage('Property ID must be a positive integer'),
  body('guest_message').optional().trim(),
  body('sub_category').optional().trim(),
  body('staff_id').optional().isInt({ min: 1 }).withMessage('Staff ID must be a positive integer'),
  body('staff_details_json').optional().trim(),
  body('staff_phone').optional().trim(),
  body('requirements_to_complete_task').optional().trim(),
  body('ai_message_response').optional().trim(),
  body('status').optional().isBoolean().withMessage('Status must be a boolean'),
  body('escalated_to_host').optional().trim(),
  body('uuids').optional().trim(),
  body('ongoing_conversation').optional().trim(),
  body('response_received').optional().isBoolean().withMessage('Response received must be a boolean'),
  body('guest_notified').optional().isBoolean().withMessage('Guest notified must be a boolean'),
  body('host_escalated').optional().isBoolean().withMessage('Host escalated must be a boolean')
];

// GET /api/task-log - List all task logs
router.get('/', [
  query('status').optional().isBoolean(),
  query('sub_category').optional().trim(),
  query('staff_id').optional().isInt({ min: 1 }),
  query('property_id').optional().isInt({ min: 1 }),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  const client = await pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Set RLS context
    if (req.user && req.user.accountId) {
      await client.query(`SET app.current_account_id = '${req.user.accountId}'`);
      await client.query(`SET app.current_user_id = '${req.user.userId}'`);
    }

    const {
      status,
      sub_category,
      staff_id,
      property_id,
      search,
      page = 1,
      limit = 50
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let whereConditions = ['account_id = COALESCE(NULLIF(current_setting(\'app.current_account_id\', true), \'\')::INTEGER, (SELECT account_id FROM users WHERE id = COALESCE(NULLIF(current_setting(\'app.current_user_id\', true), \'\')::INTEGER, 0)))'];
    let queryParams = [];
    let paramCount = 0;

    // Add filters
    if (status !== undefined) {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      queryParams.push(status === 'true');
    }

    if (sub_category) {
      paramCount++;
      whereConditions.push(`sub_category ILIKE $${paramCount}`);
      queryParams.push(`%${sub_category}%`);
    }

    if (staff_id) {
      paramCount++;
      whereConditions.push(`staff_id = $${paramCount}`);
      queryParams.push(parseInt(staff_id));
    }

    if (property_id) {
      paramCount++;
      whereConditions.push(`property_id = $${paramCount}`);
      queryParams.push(parseInt(property_id));
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(guest_message ILIKE $${paramCount} OR sub_category ILIKE $${paramCount} OR ai_message_response ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Main query - Map CSV fields to UI-expected field names
    const query = `
      SELECT 
        id,
        task_uuid as "taskId",
        phone,
        property_id as "propertyId",
        guest_message as "guestMessage",
        sub_category as "category",
        staff_id as "staffId",
        staff_details_json as "staffDetails",
        staff_phone as "staffPhone",
        requirements_to_complete_task as "requirements",
        ai_message_response as "aiResponse",
        status as "isCompleted",
        escalated_to_host as "escalatedTo",
        uuids,
        ongoing_conversation as "conversation",
        response_received as "responseReceived",
        guest_notified as "guestNotified",
        host_escalated as "hostEscalated",
        created_date as "taskCreated",
        created_at,
        updated_at
      FROM task_log
      WHERE ${whereClause}
      ORDER BY created_date DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await client.query(query, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM task_log
      WHERE ${whereClause}
    `;
    
    const countResult = await client.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      tasks: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching task logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/task-log/:id - Get single task log
router.get('/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    // Set RLS context
    if (req.user && req.user.accountId) {
      await client.query(`SET app.current_account_id = '${req.user.accountId}'`);
      await client.query(`SET app.current_user_id = '${req.user.userId}'`);
    }

    // Map CSV fields to UI-expected field names
    const query = `
      SELECT 
        id,
        task_uuid as "taskId",
        phone,
        property_id as "propertyId",
        guest_message as "guestMessage",
        sub_category as "category",
        staff_id as "staffId",
        staff_details_json as "staffDetails",
        staff_phone as "staffPhone",
        requirements_to_complete_task as "requirements",
        ai_message_response as "aiResponse",
        status as "isCompleted",
        escalated_to_host as "escalatedTo",
        uuids,
        ongoing_conversation as "conversation",
        response_received as "responseReceived",
        guest_notified as "guestNotified",
        host_escalated as "hostEscalated",
        created_date as "taskCreated",
        created_at,
        updated_at
      FROM task_log
      WHERE id = $1 AND account_id = COALESCE(
        NULLIF(current_setting('app.current_account_id', true), '')::INTEGER,
        (SELECT account_id FROM users WHERE id = COALESCE(
          NULLIF(current_setting('app.current_user_id', true), '')::INTEGER,
          0
        ))
      )
    `;

    const result = await client.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Enrich with related data
    const task = result.rows[0];

    // Get staff details if staff_id is present
    if (task.staffId) {
      const staffQuery = `
        SELECT staff_name, role, preferred_language, phone as contact_phone
        FROM staff 
        WHERE staff_id = $1 AND account_id = $2
      `;
      const staffResult = await client.query(staffQuery, [task.staffId, req.user.accountId]);
      if (staffResult.rows.length > 0) {
        task.staffInfo = staffResult.rows[0];
      }
    }

    // Get property details if property_id is present
    if (task.propertyId) {
      const propertyQuery = `
        SELECT property_title as name, property_location as address
        FROM properties 
        WHERE id = $1 AND account_id = $2
      `;
      const propertyResult = await client.query(propertyQuery, [task.propertyId, req.user.accountId]);
      if (propertyResult.rows.length > 0) {
        task.propertyInfo = propertyResult.rows[0];
      }
    }

    // Get message count for this phone number
    if (task.phone) {
      const messageQuery = `
        SELECT COUNT(*) as message_count
        FROM message_log 
        WHERE (from_number = $1 OR to_number = $1) AND account_id = $2
      `;
      const messageResult = await client.query(messageQuery, [task.phone, req.user.accountId]);
      task.messageCount = parseInt(messageResult.rows[0].message_count);
    }

    res.json(task);

  } catch (error) {
    console.error('Error fetching task log:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// PUT /api/task-log/:id - Update task log
router.put('/:id', taskLogValidation, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Set RLS context
    if (req.user && req.user.accountId) {
      await client.query(`SET app.current_account_id = '${req.user.accountId}'`);
      await client.query(`SET app.current_user_id = '${req.user.userId}'`);
    }

    const { id } = req.params;
    const { 
      task_uuid,
      phone,
      property_id,
      guest_message,
      sub_category,
      staff_id,
      staff_details_json,
      staff_phone,
      requirements_to_complete_task,
      ai_message_response,
      status = false,
      escalated_to_host,
      uuids,
      ongoing_conversation,
      response_received = false,
      guest_notified = false,
      host_escalated = false
    } = req.body;

    // Check if task exists
    const taskCheck = await client.query(`
      SELECT id FROM task_log WHERE id = $1 AND account_id = COALESCE(
        NULLIF(current_setting('app.current_account_id', true), '')::INTEGER,
        (SELECT account_id FROM users WHERE id = COALESCE(
          NULLIF(current_setting('app.current_user_id', true), '')::INTEGER,
          0
        ))
      )
    `, [id]);
    
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Map UI field names to CSV field names for UPDATE
    const query = `
      UPDATE task_log 
      SET task_uuid = $1, phone = $2, property_id = $3, guest_message = $4,
          sub_category = $5, staff_id = $6, staff_details_json = $7, staff_phone = $8,
          requirements_to_complete_task = $9, ai_message_response = $10, status = $11,
          escalated_to_host = $12, uuids = $13, ongoing_conversation = $14,
          response_received = $15, guest_notified = $16, host_escalated = $17,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $18
      RETURNING 
        id,
        task_uuid as "taskId",
        phone,
        property_id as "propertyId",
        guest_message as "guestMessage",
        sub_category as "category",
        staff_id as "staffId",
        staff_details_json as "staffDetails",
        staff_phone as "staffPhone",
        requirements_to_complete_task as "requirements",
        ai_message_response as "aiResponse",
        status as "isCompleted",
        escalated_to_host as "escalatedTo",
        uuids,
        ongoing_conversation as "conversation",
        response_received as "responseReceived",
        guest_notified as "guestNotified",
        host_escalated as "hostEscalated",
        created_date as "taskCreated",
        created_at,
        updated_at
    `;

    const result = await client.query(query, [
      task_uuid, phone, property_id, guest_message, sub_category,
      staff_id, staff_details_json, staff_phone, requirements_to_complete_task,
      ai_message_response, status, escalated_to_host, uuids, ongoing_conversation,
      response_received, guest_notified, host_escalated, id
    ]);

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error updating task log:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/task-log/stats/summary - Get task statistics
router.get('/stats/summary', async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Set RLS context
    if (req.user && req.user.accountId) {
      await client.query(`SET app.current_account_id = '${req.user.accountId}'`);
      await client.query(`SET app.current_user_id = '${req.user.userId}'`);
    }

    const accountId = req.user.accountId;

    // Get overall stats
    const overallQuery = `
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = true THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = false THEN 1 ELSE 0 END) as pending_tasks,
        SUM(CASE WHEN response_received = true THEN 1 ELSE 0 END) as responses_received,
        SUM(CASE WHEN guest_notified = true THEN 1 ELSE 0 END) as guests_notified,
        SUM(CASE WHEN host_escalated = true THEN 1 ELSE 0 END) as host_escalations
      FROM task_log 
      WHERE account_id = $1
    `;

    // Get tasks by category
    const categoryQuery = `
      SELECT sub_category as category, COUNT(*) as count
      FROM task_log 
      WHERE account_id = $1
      GROUP BY sub_category 
      ORDER BY count DESC
    `;

    // Get tasks by staff
    const staffQuery = `
      SELECT 
        t.staff_id,
        s.staff_name,
        s.role,
        COUNT(*) as task_count,
        SUM(CASE WHEN t.status = true THEN 1 ELSE 0 END) as completed_count
      FROM task_log t
      LEFT JOIN staff s ON t.staff_id = s.staff_id AND s.account_id = t.account_id
      WHERE t.account_id = $1 AND t.staff_id IS NOT NULL
      GROUP BY t.staff_id, s.staff_name, s.role
      ORDER BY task_count DESC
    `;

    const [overallResult, categoryResult, staffResult] = await Promise.all([
      client.query(overallQuery, [accountId]),
      client.query(categoryQuery, [accountId]),
      client.query(staffQuery, [accountId])
    ]);

    res.json({
      overall: overallResult.rows[0],
      byCategory: categoryResult.rows,
      byStaff: staffResult.rows
    });

  } catch (error) {
    console.error('Error fetching task stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;