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
const contactValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('service_type').trim().notEmpty().withMessage('Service type is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required')
    .matches(/^\+?[\d\s\(\)\-\.]+$/).withMessage('Invalid phone number format'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('preferred_language').optional().isLength({ min: 2, max: 10 }).withMessage('Invalid language code'),
  body('notes').optional().trim(),
  body('serviceLocations').optional().isArray().withMessage('Service locations must be an array'),
  body('serviceLocations.*').optional().isInt({ min: 1 }).withMessage('Invalid property ID')
];

// GET /api/contacts - List all contacts with optional filtering
router.get('/', [
  query('service_type').optional().trim(),
  query('property_id').optional().isInt({ min: 1 }),
  query('language').optional().isLength({ min: 2, max: 10 }),
  query('search').optional().trim(),
  query('active').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      service_type,
      property_id,
      language,
      search,
      active = 'true',
      page = 1,
      limit = 20
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let whereConditions = ['c.is_active = $1'];
    let queryParams = [active === 'true'];
    let paramCount = 1;

    // Build dynamic WHERE clause
    if (service_type) {
      paramCount++;
      whereConditions.push(`c.service_type ILIKE $${paramCount}`);
      queryParams.push(`%${service_type}%`);
    }

    if (language) {
      paramCount++;
      whereConditions.push(`c.preferred_language = $${paramCount}`);
      queryParams.push(language);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(c.name ILIKE $${paramCount} OR c.email ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    let propertyJoin = '';
    if (property_id) {
      paramCount++;
      propertyJoin = 'INNER JOIN contact_service_locations csl ON c.id = csl.contact_id';
      whereConditions.push(`csl.property_id = $${paramCount}`);
      queryParams.push(parseInt(property_id));
    }

    const whereClause = whereConditions.join(' AND ');
    
    // Main query with service locations
    const query = `
      SELECT 
        c.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'name', p.name,
              'address', p.address
            )
          ) FILTER (WHERE p.id IS NOT NULL), 
          '[]'::json
        ) as service_locations
      FROM contacts c
      ${propertyJoin}
      LEFT JOIN contact_service_locations csl2 ON c.id = csl2.contact_id
      LEFT JOIN properties p ON csl2.property_id = p.id AND p.is_active = true
      WHERE ${whereClause}
      GROUP BY c.id
      ORDER BY c.name
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM contacts c
      ${propertyJoin}
      WHERE ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      contacts: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/contacts/:id - Get single contact
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        c.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'name', p.name,
              'address', p.address
            )
          ) FILTER (WHERE p.id IS NOT NULL), 
          '[]'::json
        ) as service_locations
      FROM contacts c
      LEFT JOIN contact_service_locations csl ON c.id = csl.contact_id
      LEFT JOIN properties p ON csl.property_id = p.id AND p.is_active = true
      WHERE c.id = $1 AND c.is_active = true
      GROUP BY c.id
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/contacts - Create new contact
router.post('/', contactValidation, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      service_type,
      phone,
      email,
      preferred_language = 'en',
      notes,
      serviceLocations = []
    } = req.body;

    await client.query('BEGIN');

    // Check if email already exists
    const emailCheck = await client.query('SELECT id FROM contacts WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Insert contact
    const contactQuery = `
      INSERT INTO contacts (name, service_type, phone, email, preferred_language, notes, account_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const contactResult = await client.query(contactQuery, [
      name, service_type, phone, email, preferred_language, notes, req.user.accountId
    ]);

    const contact = contactResult.rows[0];

    // Insert service locations
    if (serviceLocations.length > 0) {
      // Verify all property IDs exist
      const propertyCheck = await client.query(
        'SELECT id FROM properties WHERE id = ANY($1) AND is_active = true',
        [serviceLocations]
      );

      if (propertyCheck.rows.length !== serviceLocations.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'One or more property IDs are invalid' });
      }

      // Insert service locations
      for (const propertyId of serviceLocations) {
        await client.query(
          'INSERT INTO contact_service_locations (contact_id, property_id) VALUES ($1, $2)',
          [contact.id, propertyId]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch the complete contact with service locations
    const completeContactQuery = `
      SELECT 
        c.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'name', p.name,
              'address', p.address
            )
          ) FILTER (WHERE p.id IS NOT NULL), 
          '[]'::json
        ) as service_locations
      FROM contacts c
      LEFT JOIN contact_service_locations csl ON c.id = csl.contact_id
      LEFT JOIN properties p ON csl.property_id = p.id AND p.is_active = true
      WHERE c.id = $1
      GROUP BY c.id
    `;

    const finalResult = await pool.query(completeContactQuery, [contact.id]);

    res.status(201).json(finalResult.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// PUT /api/contacts/:id - Update contact
router.put('/:id', contactValidation, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      name,
      service_type,
      phone,
      email,
      preferred_language,
      notes,
      serviceLocations = []
    } = req.body;

    await client.query('BEGIN');

    // Check if contact exists
    const contactCheck = await client.query('SELECT id FROM contacts WHERE id = $1 AND is_active = true', [id]);
    if (contactCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Check if email is taken by another contact
    const emailCheck = await client.query('SELECT id FROM contacts WHERE email = $1 AND id != $2', [email, id]);
    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Update contact
    const updateQuery = `
      UPDATE contacts 
      SET name = $1, service_type = $2, phone = $3, email = $4, 
          preferred_language = $5, notes = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;

    await client.query(updateQuery, [
      name, service_type, phone, email, preferred_language, notes, id
    ]);

    // Update service locations
    // First delete existing ones
    await client.query('DELETE FROM contact_service_locations WHERE contact_id = $1', [id]);

    // Insert new ones
    if (serviceLocations.length > 0) {
      // Verify all property IDs exist
      const propertyCheck = await client.query(
        'SELECT id FROM properties WHERE id = ANY($1) AND is_active = true',
        [serviceLocations]
      );

      if (propertyCheck.rows.length !== serviceLocations.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'One or more property IDs are invalid' });
      }

      for (const propertyId of serviceLocations) {
        await client.query(
          'INSERT INTO contact_service_locations (contact_id, property_id) VALUES ($1, $2)',
          [id, propertyId]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch updated contact with service locations
    const completeContactQuery = `
      SELECT 
        c.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'name', p.name,
              'address', p.address
            )
          ) FILTER (WHERE p.id IS NOT NULL), 
          '[]'::json
        ) as service_locations
      FROM contacts c
      LEFT JOIN contact_service_locations csl ON c.id = csl.contact_id
      LEFT JOIN properties p ON csl.property_id = p.id AND p.is_active = true
      WHERE c.id = $1
      GROUP BY c.id
    `;

    const result = await pool.query(completeContactQuery, [id]);
    res.json(result.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// DELETE /api/contacts/:id - Delete contact (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE contacts SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND is_active = true RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ message: 'Contact deleted successfully' });

  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/contacts/by-property/:propertyId - Get contacts by property
router.get('/by-property/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;

    const query = `
      SELECT 
        c.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'name', p.name,
              'address', p.address
            )
          ) FILTER (WHERE p.id IS NOT NULL), 
          '[]'::json
        ) as service_locations
      FROM contacts c
      INNER JOIN contact_service_locations csl ON c.id = csl.contact_id
      LEFT JOIN contact_service_locations csl2 ON c.id = csl2.contact_id
      LEFT JOIN properties p ON csl2.property_id = p.id AND p.is_active = true
      WHERE csl.property_id = $1 AND c.is_active = true
      GROUP BY c.id
      ORDER BY c.name
    `;

    const result = await pool.query(query, [propertyId]);
    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching contacts by property:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 