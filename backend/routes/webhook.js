import express from 'express';
import { validationResult, body } from 'express-validator';
import pool from '../config/database.js';

const router = express.Router();

// API Key authentication middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = process.env.WEBHOOK_API_KEY;
  
  if (!expectedApiKey) {
    return res.status(500).json({ error: 'Webhook API key not configured' });
  }
  
  if (!apiKey || apiKey !== expectedApiKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
};

// Validation rules for guest message webhook
const guestMessageValidation = [
  body('account_id').isInt({ min: 1 }).withMessage('Valid account_id is required'),
  body('property_id').optional().trim(),
  body('booking_id').optional().trim(),
  body('guest_message').trim().notEmpty().withMessage('Guest message is required'),
  body('property_details_json').optional().isJSON().withMessage('Property details must be valid JSON'),
  body('booking_details_json').optional().isJSON().withMessage('Booking details must be valid JSON'),
  body('property_faqs_json').optional().isJSON().withMessage('Property FAQs must be valid JSON'),
  body('escalation_risk_indicators').optional().trim(),
  body('available_knowledge').optional().trim(),
  body('sub_category').optional().trim(),
  body('raw_data').optional()
];

// POST /api/webhook/google-sheets-messages - Accept guest message data from Google Sheets
router.post('/google-sheets-messages', authenticateApiKey, guestMessageValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const {
      account_id,
      property_id,
      booking_id,
      guest_message,
      property_details_json,
      booking_details_json,
      property_faqs_json,
      escalation_risk_indicators,
      available_knowledge,
      sub_category,
      raw_data
    } = req.body;

    // Parse JSON fields if they're strings
    let propertyDetails = null;
    let bookingDetails = null;
    let propertyFaqs = null;
    
    try {
      if (property_details_json) {
        propertyDetails = typeof property_details_json === 'string' 
          ? JSON.parse(property_details_json) 
          : property_details_json;
      }
      
      if (booking_details_json) {
        bookingDetails = typeof booking_details_json === 'string' 
          ? JSON.parse(booking_details_json) 
          : booking_details_json;
      }
      
      if (property_faqs_json) {
        propertyFaqs = typeof property_faqs_json === 'string' 
          ? JSON.parse(property_faqs_json) 
          : property_faqs_json;
      }
    } catch (jsonError) {
      return res.status(400).json({ 
        error: 'Invalid JSON format in data fields',
        details: jsonError.message
      });
    }

    // Insert into database
    const result = await pool.query(`
      INSERT INTO guest_messages (
        account_id,
        property_id,
        booking_id,
        guest_message,
        property_details_json,
        booking_details_json,
        property_faqs_json,
        escalation_risk_indicators,
        available_knowledge,
        sub_category,
        raw_data,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
      RETURNING id, created_at
    `, [
      account_id,
      property_id || null,
      booking_id || null,
      guest_message,
      propertyDetails,
      bookingDetails,
      propertyFaqs,
      escalation_risk_indicators || null,
      available_knowledge || null,
      sub_category || null,
      raw_data || null
    ]);

    const insertedMessage = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Guest message stored successfully',
      data: {
        id: insertedMessage.id,
        created_at: insertedMessage.created_at
      }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to process guest message'
    });
  }
});

// GET /api/webhook/status - Simple health check for webhook endpoints
router.get('/status', authenticateApiKey, (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Rambley Webhook API',
    timestamp: new Date().toISOString() 
  });
});

export default router;