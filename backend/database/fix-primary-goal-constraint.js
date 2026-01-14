/**
 * Fix primary_goal CHECK constraint issue in PostgreSQL/Neon DB
 * 
 * This script removes the CHECK constraint on primary_goal column
 * that expects a single value, since we store it as a JSON array string.
 * 
 * Usage:
 *   node backend/database/fix-primary-goal-constraint.js
 * 
 * Environment Variables:
 *   DATABASE_URL - PostgreSQL connection string (recommended)
 *   POSTGRES_URL - Vercel default connection string
 */

require('dotenv').config();
const postgresDb = require('./postgres-db');

async function fixConstraint() {
  try {
    console.log('🔧 Fixing primary_goal CHECK constraint...');
    
    // Initialize connection
    postgresDb.initializePostgres();
    
    // Check if constraint exists
    const checkConstraint = await postgresDb.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints 
      WHERE constraint_name LIKE '%primary_goal%check%'
      AND table_name = 'planning_recommendations'
    `);
    
    if (checkConstraint.rows.length > 0) {
      const constraintName = checkConstraint.rows[0].constraint_name;
      console.log(`📋 Found constraint: ${constraintName}`);
      
      // Drop the constraint
      await postgresDb.query(`
        ALTER TABLE planning_recommendations 
        DROP CONSTRAINT IF EXISTS ${constraintName}
      `);
      
      console.log('✅ Successfully removed CHECK constraint on primary_goal');
    } else {
      console.log('ℹ️  No CHECK constraint found on primary_goal - table is already correct');
    }
    
    // Verify the table structure
    const tableInfo = await postgresDb.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'planning_recommendations' 
      AND column_name = 'primary_goal'
    `);
    
    if (tableInfo.rows.length > 0) {
      console.log('✅ Table structure verified:');
      console.log('   Column:', tableInfo.rows[0].column_name);
      console.log('   Type:', tableInfo.rows[0].data_type);
      console.log('   Nullable:', tableInfo.rows[0].is_nullable);
    }
    
    console.log('✅ Fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  } finally {
    await postgresDb.closePool();
  }
}

// Run fix
fixConstraint();

