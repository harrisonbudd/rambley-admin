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
  body('description').optional().trim()
];

// GET /api/properties - List all properties
router.get('/', [
  query('active').optional().isBoolean(),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      active = 'true',
      search,
      page = 1,
      limit = 50
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let whereConditions = ['is_active = $1'];
    let queryParams = [active === 'true'];
    let paramCount = 1;

    if (search) {
      paramCount++;
      whereConditions.push(`(name ILIKE $${paramCount} OR address ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Main query
    const query = `
      SELECT *,
        CASE 
          WHEN is_active = true THEN 'active'
          ELSE 'inactive'
        END as status
      FROM properties
      WHERE ${whereClause}
      ORDER BY name
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM properties
      WHERE ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
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
  }
});

// GET /api/properties/:id - Get single property
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT p.*,
      CASE 
        WHEN p.is_active = true THEN 'active'
        ELSE 'inactive'
      END as status,
      (
        SELECT COUNT(*)
        FROM contact_service_locations csl
        INNER JOIN contacts c ON csl.contact_id = c.id
        WHERE csl.property_id = p.id AND c.is_active = true
      ) as contact_count
      FROM properties p
      WHERE p.id = $1 AND p.is_active = true
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/properties - Create new property
router.post('/', propertyValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, address, description } = req.body;

    // Check if property name already exists
    const nameCheck = await pool.query('SELECT id FROM properties WHERE name = $1', [name]);
    if (nameCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Property name already exists' });
    }

    const query = `
      INSERT INTO properties (name, address, description, account_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *,
        CASE 
          WHEN is_active = true THEN 'active'
          ELSE 'inactive'
        END as status
    `;

    const result = await pool.query(query, [name, address, description, req.user.accountId]);

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/properties/:id - Update property
router.put('/:id', propertyValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, address, description } = req.body;

    // Check if property exists
    const propertyCheck = await pool.query('SELECT id FROM properties WHERE id = $1 AND is_active = true', [id]);
    if (propertyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Check if name is taken by another property
    const nameCheck = await pool.query('SELECT id FROM properties WHERE name = $1 AND id != $2', [name, id]);
    if (nameCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Property name already exists' });
    }

    const query = `
      UPDATE properties 
      SET name = $1, address = $2, description = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *,
        CASE 
          WHEN is_active = true THEN 'active'
          ELSE 'inactive'
        END as status
    `;

    const result = await pool.query(query, [name, address, description, id]);

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ error: 'Internal server error' });
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