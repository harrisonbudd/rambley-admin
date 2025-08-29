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
const propertyValidation = [
  body('name').trim().notEmpty().withMessage('Property name is required'),
  body('address').optional().trim(),
  body('description').optional().trim(),
  body('property_type').optional().trim(),
  body('bedrooms').optional().isInt({ min: 0 }).withMessage('Bedrooms must be a non-negative integer'),
  body('bathrooms').optional().isFloat({ min: 0 }).withMessage('Bathrooms must be a non-negative number'),
  body('max_guests').optional().isInt({ min: 1 }).withMessage('Max guests must be at least 1'),
  body('checkin_time').optional().trim(),
  body('checkout_time').optional().trim(),
  body('wifi_name').optional().trim(),
  body('wifi_password').optional().trim(),
  body('emergency_contact').optional().trim(),
  body('instructions').optional().trim(),
  body('house_rules').optional().trim()
];

// GET /api/properties - List all properties
router.get('/', [
  query('active').optional().isBoolean(),
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
      active = 'true',
      search,
      page = 1,
      limit = 50
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let whereConditions = ['account_id = COALESCE(NULLIF(current_setting(\'app.current_account_id\', true), \'\')::INTEGER, (SELECT account_id FROM users WHERE id = COALESCE(NULLIF(current_setting(\'app.current_user_id\', true), \'\')::INTEGER, 0)))'];
    let queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereConditions.push(`(property_title ILIKE $${paramCount} OR property_location ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Main query - Map CSV fields to UI-expected field names
    const query = `
      SELECT 
        id,
        property_title as name,
        property_location as address,
        CONCAT(COALESCE(type, ''), ' ', COALESCE(sub_type, '')) as type,
        bedrooms,
        baths as bathrooms,
        number_of_guests as "maxGuests",
        check_in_time as "checkinTime", 
        check_out_time as "checkoutTime",
        wifi_network_name as "wifiName",
        wifi_password as "wifiPassword", 
        host_email as "emergencyContact",
        check_in_method as instructions,
        additional_rules as "houseRules",
        listing_description as description,
        'active' as status,
        created_at,
        updated_at
      FROM properties
      WHERE ${whereClause}
      ORDER BY property_title
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await client.query(query, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM properties
      WHERE ${whereClause}
    `;
    
    const countResult = await client.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      properties: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/properties/:id - Get single property
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
        property_title as name,
        property_location as address,
        CONCAT(COALESCE(type, ''), ' ', COALESCE(sub_type, '')) as type,
        bedrooms,
        baths as bathrooms,
        number_of_guests as "maxGuests",
        check_in_time as "checkinTime", 
        check_out_time as "checkoutTime",
        wifi_network_name as "wifiName",
        wifi_password as "wifiPassword", 
        host_email as "emergencyContact",
        check_in_method as instructions,
        additional_rules as "houseRules",
        listing_description as description,
        'active' as status,
        created_at,
        updated_at,
        -- Property type for legacy compatibility
        type as property_type
      FROM properties
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
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// POST /api/properties - Create new property
router.post('/', propertyValidation, async (req, res) => {
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
      name, 
      address, 
      description,
      property_type,
      bedrooms = 0,
      bathrooms = 0,
      max_guests = 1,
      checkin_time = '3:00 PM',
      checkout_time = '11:00 AM',
      wifi_name,
      wifi_password,
      emergency_contact,
      instructions,
      house_rules
    } = req.body;

    // Check if property name already exists (using CSV field names)
    const nameCheck = await client.query('SELECT id FROM properties WHERE property_title = $1 AND account_id = $2', [name, req.user.accountId]);
    if (nameCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Property name already exists' });
    }

    // Map UI field names to CSV field names for INSERT
    const query = `
      INSERT INTO properties (
        property_title, property_location, listing_description, type, bedrooms, baths, number_of_guests,
        check_in_time, check_out_time, wifi_network_name, wifi_password, host_email,
        check_in_method, additional_rules, account_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING 
        id,
        property_title as name,
        property_location as address,
        CONCAT(COALESCE(type, ''), ' ', COALESCE(sub_type, '')) as type,
        bedrooms,
        baths as bathrooms,
        number_of_guests as "maxGuests",
        check_in_time as "checkinTime", 
        check_out_time as "checkoutTime",
        wifi_network_name as "wifiName",
        wifi_password as "wifiPassword", 
        host_email as "emergencyContact",
        check_in_method as instructions,
        additional_rules as "houseRules",
        listing_description as description,
        'active' as status,
        created_at,
        updated_at
    `;

    const result = await client.query(query, [
      name, // UI name → property_title
      address, // UI address → property_location  
      description, // UI description → listing_description
      property_type, // UI property_type → type
      bedrooms, // direct match
      bathrooms, // UI bathrooms → baths
      max_guests, // UI max_guests → number_of_guests
      checkin_time, // UI checkin_time → check_in_time
      checkout_time, // UI checkout_time → check_out_time
      wifi_name, // UI wifi_name → wifi_network_name
      wifi_password, // UI wifi_password → wifi_password
      emergency_contact, // UI emergency_contact → host_email
      instructions, // UI instructions → check_in_method
      house_rules, // UI house_rules → additional_rules
      req.user.accountId
    ]);

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// PUT /api/properties/:id - Update property
router.put('/:id', propertyValidation, async (req, res) => {
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
      name, 
      address, 
      description,
      property_type,
      bedrooms = 0,
      bathrooms = 0,
      max_guests = 1,
      checkin_time = '3:00 PM',
      checkout_time = '11:00 AM',
      wifi_name,
      wifi_password,
      emergency_contact,
      instructions,
      house_rules
    } = req.body;

    // Check if property exists (using CSV field names and RLS)
    const propertyCheck = await client.query(`
      SELECT id FROM properties WHERE id = $1 AND account_id = COALESCE(
        NULLIF(current_setting('app.current_account_id', true), '')::INTEGER,
        (SELECT account_id FROM users WHERE id = COALESCE(
          NULLIF(current_setting('app.current_user_id', true), '')::INTEGER,
          0
        ))
      )
    `, [id]);
    
    if (propertyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Check if name is taken by another property (using CSV field names)
    const nameCheck = await client.query(`
      SELECT id FROM properties WHERE property_title = $1 AND id != $2 AND account_id = $3
    `, [name, id, req.user.accountId]);
    
    if (nameCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Property name already exists' });
    }

    // Map UI field names to CSV field names for UPDATE
    const query = `
      UPDATE properties 
      SET property_title = $1, property_location = $2, listing_description = $3, type = $4,
          bedrooms = $5, baths = $6, number_of_guests = $7,
          check_in_time = $8, check_out_time = $9, wifi_network_name = $10, wifi_password = $11,
          host_email = $12, check_in_method = $13, additional_rules = $14,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING 
        id,
        property_title as name,
        property_location as address,
        CONCAT(COALESCE(type, ''), ' ', COALESCE(sub_type, '')) as type,
        bedrooms,
        baths as bathrooms,
        number_of_guests as "maxGuests",
        check_in_time as "checkinTime", 
        check_out_time as "checkoutTime",
        wifi_network_name as "wifiName",
        wifi_password as "wifiPassword", 
        host_email as "emergencyContact",
        check_in_method as instructions,
        additional_rules as "houseRules",
        listing_description as description,
        'active' as status,
        created_at,
        updated_at
    `;

    const result = await client.query(query, [
      name, // UI name → property_title
      address, // UI address → property_location
      description, // UI description → listing_description
      property_type, // UI property_type → type
      bedrooms, // direct match
      bathrooms, // UI bathrooms → baths
      max_guests, // UI max_guests → number_of_guests
      checkin_time, // UI checkin_time → check_in_time
      checkout_time, // UI checkout_time → check_out_time
      wifi_name, // UI wifi_name → wifi_network_name
      wifi_password, // UI wifi_password → wifi_password
      emergency_contact, // UI emergency_contact → host_email
      instructions, // UI instructions → check_in_method
      house_rules, // UI house_rules → additional_rules
      id
    ]);

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// DELETE /api/properties/:id - Delete property (soft delete)
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Check if property exists
    const propertyCheck = await client.query('SELECT id FROM properties WHERE id = $1 AND is_active = true', [id]);
    if (propertyCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Property not found' });
    }

    // Check if property has active contacts
    const contactCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM contact_service_locations csl
      INNER JOIN contacts c ON csl.contact_id = c.id
      WHERE csl.property_id = $1 AND c.is_active = true
    `, [id]);

    const contactCount = parseInt(contactCheck.rows[0].count);
    if (contactCount > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `Cannot delete property. It is currently assigned to ${contactCount} active contact(s).` 
      });
    }

    // Soft delete the property
    await client.query(
      'UPDATE properties SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    await client.query('COMMIT');

    res.json({ message: 'Property deleted successfully' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting property:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router; 