import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users/profile
router.get('/profile', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, created_at, last_login FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      createdAt: user.created_at,
      lastLogin: user.last_login
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/profile
router.put('/profile', [
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('email').optional().isEmail().normalizeEmail()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Invalid input',
        details: errors.array()
      });
    }

    const { firstName, lastName, email } = req.body;
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    if (firstName !== undefined) {
      updateFields.push(`first_name = $${++paramCount}`);
      updateValues.push(firstName);
    }
    if (lastName !== undefined) {
      updateFields.push(`last_name = $${++paramCount}`);
      updateValues.push(lastName);
    }
    if (email !== undefined) {
      updateFields.push(`email = $${++paramCount}`);
      updateValues.push(email);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(req.user.id);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')} 
      WHERE id = $${++paramCount}
      RETURNING id, email, first_name, last_name, role, updated_at
    `;

    const result = await pool.query(query, updateValues);
    const user = result.rows[0];

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/password
router.put('/password', [
  body('currentPassword').notEmpty(),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one letter, one number, and one special character')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Invalid input',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get current password hash
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    // Invalidate all refresh tokens for this user
    await pool.query(
      'DELETE FROM user_sessions WHERE user_id = $1',
      [req.user.id]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Admin routes

// GET /api/users (Admin only)
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, is_active, created_at, last_login
       FROM users 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      users: result.rows.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        lastLogin: user.last_login
      })),
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: result.rows.length,
        totalUsers: total
      }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id/toggle-active (Admin only)
router.put('/:id/toggle-active', requireAdmin, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const result = await pool.query(
      'UPDATE users SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING is_active',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If deactivating, remove all sessions
    if (!result.rows[0].is_active) {
      await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
    }

    res.json({ 
      message: `User ${result.rows[0].is_active ? 'activated' : 'deactivated'} successfully`,
      isActive: result.rows[0].is_active
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/:id (Admin only)
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router; 