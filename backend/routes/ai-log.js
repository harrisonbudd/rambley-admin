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
const aiLogValidation = [
  body('uuid').optional().trim(),
  body('recipient_type').optional().trim(),
  body('property_id').optional().isInt({ min: 1 }).withMessage('Property ID must be a positive integer'),
  body('to_recipient').optional().trim(),
  body('message_chain_uuids').optional().trim(),
  body('message').optional().trim(),
  body('language').optional().trim(),
  body('ticket_enrichment_json').optional().trim(),
  body('tone').optional().trim(),
  body('sentiment').optional().trim(),
  body('urgency_indicators').optional().trim(),
  body('sub_category').optional().trim(),
  body('complexity_indicators').optional().trim(),
  body('escalation_risk_indicators').optional().trim(),
  body('available_knowledge_to_respond').optional().trim(),
  body('ai_message_response').optional().trim(),
  body('status').optional().trim(),
  body('task_created').optional().isBoolean().withMessage('Task created must be a boolean'),
  body('task_uuid').optional().trim(),
  body('sent_check').optional().isInt().withMessage('Sent check must be an integer'),
  body('response_eval_pass_fail').optional().trim(),
  body('booking_details_json').optional().trim(),
  body('property_details_json').optional().trim(),
  body('property_faqs_json').optional().trim()
];

// GET /api/ai-log - List all AI logs with advanced filtering
router.get('/', [
  query('sentiment').optional().trim(),
  query('tone').optional().trim(),
  query('urgency').optional().trim(),
  query('complexity').optional().trim(),
  query('escalation_risk').optional().trim(),
  query('status').optional().trim(),
  query('property_id').optional().isInt({ min: 1 }),
  query('language').optional().trim(),
  query('recipient_type').optional().trim(),
  query('evaluation').optional().trim(),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sort').optional().isIn(['timestamp', 'sentiment', 'tone', 'urgency']),
  query('order').optional().isIn(['asc', 'desc'])
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
      sentiment,
      tone,
      urgency,
      complexity,
      escalation_risk,
      status,
      property_id,
      language,
      recipient_type,
      evaluation,
      search,
      page = 1,
      limit = 50,
      sort = 'timestamp',
      order = 'desc'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let whereConditions = ['account_id = COALESCE(NULLIF(current_setting(\'app.current_account_id\', true), \'\')::INTEGER, (SELECT account_id FROM users WHERE id = COALESCE(NULLIF(current_setting(\'app.current_user_id\', true), \'\')::INTEGER, 0)))'];
    let queryParams = [];
    let paramCount = 0;

    // Add advanced filters
    if (sentiment) {
      paramCount++;
      whereConditions.push(`sentiment ILIKE $${paramCount}`);
      queryParams.push(`%${sentiment}%`);
    }

    if (tone) {
      paramCount++;
      whereConditions.push(`tone ILIKE $${paramCount}`);
      queryParams.push(`%${tone}%`);
    }

    if (urgency) {
      paramCount++;
      whereConditions.push(`urgency_indicators ILIKE $${paramCount}`);
      queryParams.push(`%${urgency}%`);
    }

    if (complexity) {
      paramCount++;
      whereConditions.push(`complexity_indicators ILIKE $${paramCount}`);
      queryParams.push(`%${complexity}%`);
    }

    if (escalation_risk) {
      paramCount++;
      whereConditions.push(`escalation_risk_indicators ILIKE $${paramCount}`);
      queryParams.push(`%${escalation_risk}%`);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`status ILIKE $${paramCount}`);
      queryParams.push(`%${status}%`);
    }

    if (property_id) {
      paramCount++;
      whereConditions.push(`property_id = $${paramCount}`);
      queryParams.push(parseInt(property_id));
    }

    if (language) {
      paramCount++;
      whereConditions.push(`language ILIKE $${paramCount}`);
      queryParams.push(`%${language}%`);
    }

    if (recipient_type) {
      paramCount++;
      whereConditions.push(`recipient_type ILIKE $${paramCount}`);
      queryParams.push(`%${recipient_type}%`);
    }

    if (evaluation) {
      paramCount++;
      whereConditions.push(`response_eval_pass_fail ILIKE $${paramCount}`);
      queryParams.push(`%${evaluation}%`);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(message ILIKE $${paramCount} OR ai_message_response ILIKE $${paramCount} OR sub_category ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Determine sort column
    let sortColumn = 'execution_timestamp';
    switch (sort) {
      case 'sentiment': sortColumn = 'sentiment'; break;
      case 'tone': sortColumn = 'tone'; break;
      case 'urgency': sortColumn = 'urgency_indicators'; break;
      default: sortColumn = 'execution_timestamp';
    }

    // Main query - Map CSV fields to UI-expected field names
    const query = `
      SELECT 
        id,
        uuid as "aiLogId",
        recipient_type as "recipientType",
        property_id as "propertyId",
        to_recipient as "toRecipient",
        message_chain_uuids as "messageChain",
        message,
        language,
        ticket_enrichment_json as "enrichmentData",
        tone,
        sentiment,
        urgency_indicators as "urgency",
        sub_category as "category",
        complexity_indicators as "complexity",
        escalation_risk_indicators as "escalationRisk",
        available_knowledge_to_respond as "knowledgeAvailable",
        ai_message_response as "aiResponse",
        status,
        task_created as "taskCreated",
        task_uuid as "taskId",
        sent_check as "sentCheck",
        response_eval_pass_fail as "responseEvaluation",
        booking_details_json as "bookingDetails",
        property_details_json as "propertyDetails",
        property_faqs_json as "propertyFAQs",
        execution_timestamp as "timestamp",
        created_at,
        updated_at
      FROM ai_log
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${order.toUpperCase()}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await client.query(query, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ai_log
      WHERE ${whereClause}
    `;
    
    const countResult = await client.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      logs: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching AI logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/ai-log/:id - Get single AI log with enriched data
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
        uuid as "aiLogId",
        recipient_type as "recipientType",
        property_id as "propertyId",
        to_recipient as "toRecipient",
        message_chain_uuids as "messageChain",
        message,
        language,
        ticket_enrichment_json as "enrichmentData",
        tone,
        sentiment,
        urgency_indicators as "urgency",
        sub_category as "category",
        complexity_indicators as "complexity",
        escalation_risk_indicators as "escalationRisk",
        available_knowledge_to_respond as "knowledgeAvailable",
        ai_message_response as "aiResponse",
        status,
        task_created as "taskCreated",
        task_uuid as "taskId",
        sent_check as "sentCheck",
        response_eval_pass_fail as "responseEvaluation",
        booking_details_json as "bookingDetails",
        property_details_json as "propertyDetails",
        property_faqs_json as "propertyFAQs",
        execution_timestamp as "timestamp",
        created_at,
        updated_at
      FROM ai_log
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
      return res.status(404).json({ error: 'AI log not found' });
    }

    // Enrich with related data
    const aiLog = result.rows[0];

    // Get property details if property_id is present
    if (aiLog.propertyId) {
      const propertyQuery = `
        SELECT property_title as name, property_location as address
        FROM properties 
        WHERE id = $1 AND account_id = $2
      `;
      const propertyResult = await client.query(propertyQuery, [aiLog.propertyId, req.user.accountId]);
      if (propertyResult.rows.length > 0) {
        aiLog.propertyInfo = propertyResult.rows[0];
      }
    }

    // Get related task if task_uuid is present
    if (aiLog.taskId) {
      const taskQuery = `
        SELECT id, sub_category as category, status as completed
        FROM task_log 
        WHERE task_uuid = $1 AND account_id = $2
      `;
      const taskResult = await client.query(taskQuery, [aiLog.taskId, req.user.accountId]);
      if (taskResult.rows.length > 0) {
        aiLog.relatedTask = taskResult.rows[0];
      }
    }

    // Get message count for this conversation chain
    if (aiLog.messageChain) {
      const messageQuery = `
        SELECT COUNT(*) as message_count
        FROM message_log 
        WHERE account_id = $1 AND (
          message_body LIKE $2 OR 
          external_id = ANY(string_to_array($3, ', '))
        )
      `;
      const messageResult = await client.query(messageQuery, [
        req.user.accountId, 
        `%${aiLog.messageChain}%`,
        aiLog.messageChain
      ]);
      aiLog.conversationMessageCount = parseInt(messageResult.rows[0].message_count);
    }

    // Parse JSON fields for UI
    try {
      if (aiLog.enrichmentData) {
        aiLog.parsedEnrichment = JSON.parse(aiLog.enrichmentData);
      }
      if (aiLog.bookingDetails) {
        aiLog.parsedBookingDetails = JSON.parse(aiLog.bookingDetails);
      }
      if (aiLog.propertyDetails) {
        aiLog.parsedPropertyDetails = JSON.parse(aiLog.propertyDetails);
      }
      if (aiLog.propertyFAQs) {
        aiLog.parsedPropertyFAQs = JSON.parse(aiLog.propertyFAQs);
      }
    } catch (e) {
      // JSON parsing failed - keep raw strings
    }

    res.json(aiLog);

  } catch (error) {
    console.error('Error fetching AI log:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/ai-log/stats/performance - AI performance analytics
router.get('/stats/performance', async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Set RLS context
    if (req.user && req.user.accountId) {
      await client.query(`SET app.current_account_id = '${req.user.accountId}'`);
      await client.query(`SET app.current_user_id = '${req.user.userId}'`);
    }

    const accountId = req.user.accountId;

    // Get overall performance metrics
    const performanceQuery = `
      SELECT 
        COUNT(*) as total_interactions,
        COUNT(CASE WHEN response_eval_pass_fail = 'pass' THEN 1 END) as successful_responses,
        COUNT(CASE WHEN response_eval_pass_fail = 'fail' THEN 1 END) as failed_responses,
        COUNT(CASE WHEN task_created = true THEN 1 END) as tasks_created,
        COUNT(CASE WHEN escalation_risk_indicators = 'None' THEN 1 END) as no_escalation_risk,
        COUNT(CASE WHEN available_knowledge_to_respond = 'Yes' THEN 1 END) as knowledge_available,
        ROUND(AVG(CASE WHEN urgency_indicators = 'Low' THEN 1 
                       WHEN urgency_indicators = 'Medium' THEN 2 
                       WHEN urgency_indicators = 'High' THEN 3 
                       ELSE 0 END), 2) as avg_urgency_score
      FROM ai_log 
      WHERE account_id = $1
    `;

    // Get performance by category
    const categoryPerformanceQuery = `
      SELECT 
        sub_category as category,
        COUNT(*) as total,
        COUNT(CASE WHEN response_eval_pass_fail = 'pass' THEN 1 END) as successful,
        ROUND(COUNT(CASE WHEN response_eval_pass_fail = 'pass' THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate
      FROM ai_log 
      WHERE account_id = $1 AND sub_category IS NOT NULL
      GROUP BY sub_category 
      ORDER BY total DESC
    `;

    // Get performance trends over time
    const trendQuery = `
      SELECT 
        DATE(execution_timestamp) as date,
        COUNT(*) as interactions,
        COUNT(CASE WHEN response_eval_pass_fail = 'pass' THEN 1 END) as successful,
        ROUND(COUNT(CASE WHEN response_eval_pass_fail = 'pass' THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate
      FROM ai_log 
      WHERE account_id = $1 AND execution_timestamp IS NOT NULL
      GROUP BY DATE(execution_timestamp)
      ORDER BY date DESC
      LIMIT 30
    `;

    const [performanceResult, categoryResult, trendResult] = await Promise.all([
      client.query(performanceQuery, [accountId]),
      client.query(categoryPerformanceQuery, [accountId]),
      client.query(trendQuery, [accountId])
    ]);

    const performance = performanceResult.rows[0];
    const successRate = performance.total_interactions > 0 ? 
      Math.round((performance.successful_responses / performance.total_interactions) * 100) : 0;

    res.json({
      overall: {
        ...performance,
        success_rate: successRate,
        knowledge_coverage: performance.total_interactions > 0 ? 
          Math.round((performance.knowledge_available / performance.total_interactions) * 100) : 0
      },
      byCategory: categoryResult.rows,
      trends: trendResult.rows.reverse() // Show oldest to newest
    });

  } catch (error) {
    console.error('Error fetching AI performance stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/ai-log/stats/sentiment - Sentiment analysis breakdown
router.get('/stats/sentiment', async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Set RLS context
    if (req.user && req.user.accountId) {
      await client.query(`SET app.current_account_id = '${req.user.accountId}'`);
      await client.query(`SET app.current_user_id = '${req.user.userId}'`);
    }

    const accountId = req.user.accountId;

    // Get sentiment distribution
    const sentimentQuery = `
      SELECT 
        sentiment,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
      FROM ai_log 
      WHERE account_id = $1 AND sentiment IS NOT NULL
      GROUP BY sentiment 
      ORDER BY count DESC
    `;

    // Get tone distribution
    const toneQuery = `
      SELECT 
        tone,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
      FROM ai_log 
      WHERE account_id = $1 AND tone IS NOT NULL
      GROUP BY tone 
      ORDER BY count DESC
    `;

    // Get sentiment trends over time
    const sentimentTrendQuery = `
      SELECT 
        DATE(execution_timestamp) as date,
        sentiment,
        COUNT(*) as count
      FROM ai_log 
      WHERE account_id = $1 AND execution_timestamp IS NOT NULL AND sentiment IS NOT NULL
      GROUP BY DATE(execution_timestamp), sentiment
      ORDER BY date DESC, sentiment
      LIMIT 90
    `;

    // Get urgency analysis
    const urgencyQuery = `
      SELECT 
        urgency_indicators as urgency,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
        COUNT(CASE WHEN response_eval_pass_fail = 'pass' THEN 1 END) as successful_responses
      FROM ai_log 
      WHERE account_id = $1 AND urgency_indicators IS NOT NULL
      GROUP BY urgency_indicators 
      ORDER BY count DESC
    `;

    const [sentimentResult, toneResult, trendResult, urgencyResult] = await Promise.all([
      client.query(sentimentQuery, [accountId]),
      client.query(toneQuery, [accountId]),
      client.query(sentimentTrendQuery, [accountId]),
      client.query(urgencyQuery, [accountId])
    ]);

    res.json({
      sentiment: sentimentResult.rows,
      tone: toneResult.rows,
      urgency: urgencyResult.rows,
      trends: trendResult.rows
    });

  } catch (error) {
    console.error('Error fetching sentiment stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/ai-log/stats/escalation - Escalation analysis
router.get('/stats/escalation', async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Set RLS context
    if (req.user && req.user.accountId) {
      await client.query(`SET app.current_account_id = '${req.user.accountId}'`);
      await client.query(`SET app.current_user_id = '${req.user.userId}'`);
    }

    const accountId = req.user.accountId;

    // Get escalation risk distribution
    const escalationQuery = `
      SELECT 
        escalation_risk_indicators as risk_level,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
        COUNT(CASE WHEN task_created = true THEN 1 END) as tasks_created
      FROM ai_log 
      WHERE account_id = $1 AND escalation_risk_indicators IS NOT NULL
      GROUP BY escalation_risk_indicators 
      ORDER BY count DESC
    `;

    // Get complexity analysis
    const complexityQuery = `
      SELECT 
        complexity_indicators as complexity,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
        ROUND(AVG(CASE WHEN response_eval_pass_fail = 'pass' THEN 100.0 ELSE 0.0 END), 2) as success_rate
      FROM ai_log 
      WHERE account_id = $1 AND complexity_indicators IS NOT NULL
      GROUP BY complexity_indicators 
      ORDER BY count DESC
    `;

    // Get knowledge availability analysis
    const knowledgeQuery = `
      SELECT 
        available_knowledge_to_respond as knowledge_available,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
        COUNT(CASE WHEN response_eval_pass_fail = 'pass' THEN 1 END) as successful_responses
      FROM ai_log 
      WHERE account_id = $1 AND available_knowledge_to_respond IS NOT NULL
      GROUP BY available_knowledge_to_respond 
      ORDER BY count DESC
    `;

    const [escalationResult, complexityResult, knowledgeResult] = await Promise.all([
      client.query(escalationQuery, [accountId]),
      client.query(complexityQuery, [accountId]),
      client.query(knowledgeQuery, [accountId])
    ]);

    res.json({
      escalationRisk: escalationResult.rows,
      complexity: complexityResult.rows,
      knowledgeAvailability: knowledgeResult.rows
    });

  } catch (error) {
    console.error('Error fetching escalation stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;