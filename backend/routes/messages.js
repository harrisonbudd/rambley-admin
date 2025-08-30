import express from 'express';
import { validationResult, query, param } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { setAccountContext } from '../middleware/setAccountContext.js';

const router = express.Router();

// Apply authentication and account context to all routes
router.use(authenticateToken);
router.use(setAccountContext);

// Utility function to format relative time
const formatRelativeTime = (timestamp) => {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes === 1) return '1 minute ago';
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours === 1) return '1 hour ago';
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return '1 day ago';
  return `${diffInDays} days ago`;
};

// Utility function to extract phone number based on message direction
const extractPhoneNumber = (messages) => {
  // Find the first guest message (Inbound) to get guest's phone number
  const guestMessage = messages.find(msg => msg.message_type === 'Inbound');
  if (guestMessage && guestMessage.from_number) {
    return guestMessage.from_number;
  }
  
  // Fallback to any available phone number
  const anyMessage = messages.find(msg => msg.from_number || msg.to_number);
  return anyMessage?.from_number || anyMessage?.to_number || 'Phone not available';
};

// Transform database message to UI format
const transformMessage = (dbMessage) => ({
  id: dbMessage.id,
  text: dbMessage.message_body || '',
  sender: dbMessage.message_type === 'Inbound' ? 'guest' : 'host',
  senderType: dbMessage.requestor_role === 'ai' ? 'rambley' : 'host',
  timestamp: new Date(dbMessage.timestamp).toLocaleTimeString([], { 
    hour: 'numeric', 
    minute: '2-digit' 
  })
});

// Transform database conversation to UI format
const transformConversation = (bookingId, messages, guestName = null) => {
  const latestMessage = messages[0]; // Already ordered by timestamp DESC
  
  return {
    id: bookingId || `conversation_${latestMessage.id}`,
    guestName: guestName || 'Guest',
    phone: extractPhoneNumber(messages),
    property: 'Property Details Missing',
    lastMessage: latestMessage.message_body || '',
    timestamp: formatRelativeTime(latestMessage.timestamp),
    unread: 0,
    autoResponseEnabled: true,
    messages: messages.map(transformMessage)
  };
};

// GET /api/messages - Get all conversations grouped by booking_id
router.get('/', [
  query('search').optional().trim(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
], async (req, res) => {
  const client = await pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { search, limit = 50 } = req.query;

    // Set RLS context on the same connection that will run the query
    if (req.user && req.user.accountId) {
      await client.query(`SET app.current_account_id = '${req.user.accountId}'`);
      await client.query(`SET app.current_user_id = '${req.user.userId}'`);
    }

    // Build the WHERE clause for search functionality
    let searchConditions = '';
    let queryParams = [];
    
    if (search) {
      searchConditions = `
        AND (
          ml.message_body ILIKE $${queryParams.length + 1} OR
          ml.from_number ILIKE $${queryParams.length + 1} OR
          ml.to_number ILIKE $${queryParams.length + 1} OR
          ml.booking_id ILIKE $${queryParams.length + 1}
        )
      `;
      queryParams.push(`%${search}%`);
    }

    // Query to get conversations with their latest message and guest names
    const conversationsQuery = `
      WITH latest_messages AS (
        SELECT DISTINCT ON (COALESCE(ml.booking_id, 'no_booking_' || ml.from_number || '_' || ml.to_number))
          COALESCE(ml.booking_id, 'no_booking_' || ml.from_number || '_' || ml.to_number) as conversation_id,
          ml.booking_id,
          ml.id,
          ml.message_uuid,
          ml.timestamp,
          ml.from_number,
          ml.to_number,
          ml.message_body,
          ml.message_type,
          ml.requestor_role,
          COALESCE(b.guest, 'Guest') as guest_name
        FROM message_log ml
        LEFT JOIN bookings b ON (CASE WHEN ml.booking_id ~ '^[0-9]+$' THEN ml.booking_id::integer ELSE NULL END) = b.booking_id AND b.account_id = ml.account_id
        WHERE ml.account_id = COALESCE(
          NULLIF(current_setting('app.current_account_id', true), '')::INTEGER,
          (SELECT account_id FROM users WHERE id = COALESCE(
            NULLIF(current_setting('app.current_user_id', true), '')::INTEGER,
            0
          ))
        )
        ${searchConditions}
        ORDER BY conversation_id, ml.timestamp DESC
      )
      SELECT * FROM latest_messages
      ORDER BY timestamp DESC
      LIMIT $${queryParams.length + 1}
    `;
    
    queryParams.push(limit);

    const result = await client.query(conversationsQuery, queryParams);
    
    // Transform each conversation
    const conversations = result.rows.map(row => {
      return transformConversation(row.booking_id, [row], row.guest_name);
    });

    res.json({
      success: true,
      data: conversations,
      count: conversations.length
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch conversations'
    });
  } finally {
    client.release();
  }
});

// GET /api/messages/:conversationId - Get all messages for a specific conversation
router.get('/:conversationId', [
  param('conversationId').trim().notEmpty().withMessage('Conversation ID is required'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).toInt()
], async (req, res) => {
  const client = await pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { conversationId } = req.params;
    const { limit = 500 } = req.query;

    // Set RLS context on the same connection that will run the query
    if (req.user && req.user.accountId) {
      await client.query(`SET app.current_account_id = '${req.user.accountId}'`);
      await client.query(`SET app.current_user_id = '${req.user.userId}'`);
    }

    // Handle both booking_id and generated conversation_id formats
    let whereClause;
    let queryParams = [limit];

    if (conversationId.startsWith('no_booking_')) {
      // Extract phone numbers from generated conversation ID
      const parts = conversationId.replace('no_booking_', '').split('_');
      if (parts.length >= 2) {
        const phone1 = parts.slice(0, -1).join('_');
        const phone2 = parts[parts.length - 1];
        whereClause = `
          AND booking_id IS NULL 
          AND (
            (from_number = $${queryParams.length + 1} AND to_number = $${queryParams.length + 2}) OR
            (from_number = $${queryParams.length + 2} AND to_number = $${queryParams.length + 1})
          )
        `;
        queryParams.push(phone1, phone2);
      } else {
        return res.status(400).json({
          error: 'Invalid conversation ID format'
        });
      }
    } else {
      // Regular booking_id
      whereClause = 'AND booking_id = $' + (queryParams.length + 1);
      queryParams.push(conversationId);
    }

    const messagesQuery = `
      SELECT 
        id,
        message_uuid,
        timestamp,
        from_number,
        to_number,
        message_body,
        message_type,
        requestor_role,
        booking_id
      FROM message_log
      WHERE account_id = COALESCE(
        NULLIF(current_setting('app.current_account_id', true), '')::INTEGER,
        (SELECT account_id FROM users WHERE id = COALESCE(
          NULLIF(current_setting('app.current_user_id', true), '')::INTEGER,
          0
        ))
      )
      ${whereClause}
      ORDER BY timestamp ASC
      LIMIT $1
    `;

    const result = await client.query(messagesQuery, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Conversation not found'
      });
    }

    // Transform messages and create conversation object
    const messages = result.rows;
    
    // Get guest name from booking if available
    let guestName = null;
    if (messages[0].booking_id && messages[0].booking_id.match(/^[0-9]+$/)) {
      const guestQuery = `
        SELECT guest 
        FROM bookings 
        WHERE booking_id = $1::integer AND account_id = COALESCE(
          NULLIF(current_setting('app.current_account_id', true), '')::INTEGER,
          (SELECT account_id FROM users WHERE id = COALESCE(
            NULLIF(current_setting('app.current_user_id', true), '')::INTEGER,
            0
          ))
        )
      `;
      const guestResult = await client.query(guestQuery, [messages[0].booking_id]);
      guestName = guestResult.rows.length > 0 ? guestResult.rows[0].guest : null;
    }
    
    const conversation = transformConversation(
      messages[0].booking_id || conversationId, 
      messages.reverse(), // Reverse to show latest at bottom
      guestName
    );

    res.json({
      success: true,
      data: conversation
    });

  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch conversation messages'
    });
  } finally {
    client.release();
  }
});

export default router;