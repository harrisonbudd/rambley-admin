import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

const runMigrations = async () => {
  try {
    console.log('🔄 Starting database migrations...');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);

    // Create user_sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        refresh_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(refresh_token)');

    console.log('✅ Database tables created successfully');

    // Check if admin user exists
    const adminCheck = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['admin']);
    const adminCount = parseInt(adminCheck.rows[0].count);

    if (adminCount === 0) {
      console.log('👤 Creating default admin user...');
      
      // Create default admin user
      const defaultPassword = 'AdminPass123!';
      const passwordHash = await bcrypt.hash(defaultPassword, 12);
      
      await pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role) 
        VALUES ($1, $2, $3, $4, $5)
      `, ['admin@rambley.com', passwordHash, 'Admin', 'User', 'admin']);

      console.log('✅ Default admin user created:');
      console.log('   Email: admin@rambley.com');
      console.log('   Password: AdminPass123!');
      console.log('   ⚠️  Please change this password after first login!');
    } else {
      console.log(`ℹ️  Found ${adminCount} admin user(s) - skipping default user creation`);
    }

    console.log('🎉 Database migrations completed successfully!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
};

// Run migrations
runMigrations()
  .then(() => {
    console.log('✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to run migrations:', error);
    process.exit(1);
  }); 