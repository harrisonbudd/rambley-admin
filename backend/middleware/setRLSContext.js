/**
 * Row Level Security (RLS) Context Middleware
 * Sets PostgreSQL session variables for account_id and user_id
 * Used across all routes that need RLS context
 */

export const setRLSContext = async (req, res, next) => {
  // Skip RLS context if user info is not available
  if (!req.user || !req.user.accountId) {
    return next();
  }

  try {
    // Get database connection from the request if it exists, otherwise skip
    // This middleware expects routes to have already acquired a connection
    // and attached it to req.dbClient
    if (!req.dbClient) {
      return next();
    }

    // Set RLS context variables for the current connection
    await req.dbClient.query(`SET app.current_account_id = '${req.user.accountId}'`);
    await req.dbClient.query(`SET app.current_user_id = '${req.user.userId}'`);

    next();
  } catch (error) {
    console.error('Error setting RLS context:', error);
    next(error);
  }
};

/**
 * Higher-order function to wrap route handlers with RLS context
 * Usage: wrapWithRLS(async (req, res) => { ... })
 */
export const withRLS = (routeHandler) => {
  return async (req, res, next) => {
    const pool = (await import('../config/database.js')).default;
    const client = await pool.connect();
    
    try {
      // Attach client to request for use in the route handler
      req.dbClient = client;
      
      // Set RLS context if user information is available
      if (req.user && req.user.accountId) {
        await client.query(`SET app.current_account_id = '${req.user.accountId}'`);
        await client.query(`SET app.current_user_id = '${req.user.userId}'`);
      }
      
      // Call the actual route handler
      await routeHandler(req, res);
      
    } catch (error) {
      console.error('Error in withRLS wrapper:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Database operation failed'
      });
    } finally {
      // Always release the client
      if (client) {
        client.release();
      }
    }
  };
};