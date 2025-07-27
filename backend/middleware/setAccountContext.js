import pool from '../config/database.js';

/**
 * Middleware to set account context for Row Level Security
 * This must be used after authenticateToken middleware
 */
export const setAccountContext = async (req, res, next) => {
  try {
    // Only set context if user is authenticated
    if (req.user && req.user.accountId) {
      // Set both account_id and user_id for RLS policies
      await pool.query('SELECT set_config($1, $2, true)', ['app.current_account_id', req.user.accountId.toString()]);
      await pool.query('SELECT set_config($1, $2, true)', ['app.current_user_id', req.user.userId.toString()]);
    }
    next();
  } catch (error) {
    console.error('Error setting account context:', error);
    // Don't fail the request, but log the error
    next();
  }
};

/**
 * Higher-order function to create account-aware route handlers
 * Automatically sets account_id for CREATE operations
 */
export const withAccountContext = (handler) => {
  return async (req, res, next) => {
    try {
      // Set account context
      await setAccountContext(req, res, () => {});
      
      // Add account_id to request body for CREATE operations
      if (req.method === 'POST' && req.user && req.user.accountId) {
        req.body.account_id = req.user.accountId;
      }
      
      return handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

export default setAccountContext; 