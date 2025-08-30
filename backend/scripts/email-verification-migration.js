import pool from '../config/database.js';

const addEmailVerificationFields = async () => {
  try {
    console.log('🔄 Adding email verification fields to users table...');

    // Add email verification columns
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP
    `);

    // Create index on verification token for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_verification_token 
      ON users(email_verification_token)
    `);

    // Update existing users to be email verified (to not break existing accounts)
    await pool.query(`
      UPDATE users 
      SET email_verified = true 
      WHERE email_verified IS NULL OR email_verified = false
    `);

    console.log('✅ Email verification fields added successfully');
    
  } catch (error) {
    console.error('💥 Failed to add email verification fields:', error);
    throw error;
  }
};

// Run migration
addEmailVerificationFields()
  .then(() => {
    console.log('✨ Email verification migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

export default addEmailVerificationFields;