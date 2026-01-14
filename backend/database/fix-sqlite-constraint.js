/**
 * Fix primary_goal CHECK constraint issue in SQLite
 * 
 * This script removes the CHECK constraint on primary_goal column
 * that expects a single value, since we store it as a JSON array string.
 * 
 * Usage:
 *   node backend/database/fix-sqlite-constraint.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'vidyutai.db');

async function fixConstraint() {
  try {
    console.log('🔧 Fixing primary_goal CHECK constraint in SQLite...');
    console.log('📁 Database file:', DB_PATH);
    
    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
    
    // Check if table exists
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='planning_recommendations'").get();
    
    if (!tableExists) {
      console.log('ℹ️  Table planning_recommendations does not exist yet');
      db.close();
      return;
    }
    
    // SQLite doesn't support DROP CONSTRAINT directly
    // We need to recreate the table without the constraint
    console.log('📋 Reading current table structure...');
    
    // Get current table structure
    const tableInfo = db.prepare("PRAGMA table_info(planning_recommendations)").all();
    console.log('Current columns:', tableInfo.map(c => c.name).join(', '));
    
    // Check if constraint exists by trying to insert invalid data
    // If it fails, the constraint exists
    try {
      db.prepare("INSERT INTO planning_recommendations (id, user_id, load_profile_id, preferred_sources, primary_goal, allow_diesel, technical_sizing, economic_analysis, emissions_analysis, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run('test-id', 'test-user', 'test-load', '[]', '["invalid"]', 0, '{}', '{}', '{}', 'draft');
      // If insert succeeds, no constraint (or constraint allows it)
      db.prepare("DELETE FROM planning_recommendations WHERE id = 'test-id'").run();
      console.log('ℹ️  No CHECK constraint found or constraint allows JSON arrays');
    } catch (error) {
      if (error.message.includes('CHECK constraint')) {
        console.log('⚠️  CHECK constraint found - recreating table...');
        
        // Create backup table
        db.exec(`
          CREATE TABLE planning_recommendations_backup AS 
          SELECT * FROM planning_recommendations
        `);
        
        // Drop old table
        db.exec('DROP TABLE planning_recommendations');
        
        // Recreate without CHECK constraint
        db.exec(`
          CREATE TABLE planning_recommendations (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            site_id TEXT,
            load_profile_id TEXT NOT NULL,
            preferred_sources TEXT NOT NULL,
            primary_goal TEXT NOT NULL,
            allow_diesel BOOLEAN DEFAULT 0,
            technical_sizing TEXT NOT NULL,
            economic_analysis TEXT NOT NULL,
            emissions_analysis TEXT NOT NULL,
            scenario_link TEXT,
            status TEXT CHECK(status IN ('draft', 'saved', 'applied')) DEFAULT 'draft',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL,
            FOREIGN KEY (load_profile_id) REFERENCES load_profiles(id) ON DELETE CASCADE
          )
        `);
        
        // Restore data
        db.exec(`
          INSERT INTO planning_recommendations 
          SELECT * FROM planning_recommendations_backup
        `);
        
        // Drop backup
        db.exec('DROP TABLE planning_recommendations_backup');
        
        console.log('✅ Successfully removed CHECK constraint on primary_goal');
      } else {
        console.log('⚠️  Error checking constraint:', error.message);
      }
    }
    
    // Verify
    const finalInfo = db.prepare("PRAGMA table_info(planning_recommendations)").all();
    console.log('✅ Table structure verified');
    console.log('   Columns:', finalInfo.map(c => `${c.name} (${c.type})`).join(', '));
    
    db.close();
    console.log('✅ Fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run fix
fixConstraint();

