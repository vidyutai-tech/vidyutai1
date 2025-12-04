/**
 * PostgreSQL Migration Script
 * Run this script to initialize or migrate your PostgreSQL database
 * 
 * Usage:
 *   node migrate-postgres.js
 * 
 * Environment Variables:
 *   DATABASE_URL - PostgreSQL connection string (recommended)
 *   POSTGRES_URL - Vercel default connection string
 *   STORAGE_URL - Custom prefix connection string
 *   OR
 *   POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
 */

require('dotenv').config();
const postgresDb = require('./postgres-db');
const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, 'schema-postgres.sql');
const SEED_PATH = path.join(__dirname, 'seed.sql');

async function migrate() {
  try {
    console.log('🚀 Starting PostgreSQL migration...');
    
    // Initialize connection
    postgresDb.initializePostgres();
    
    // Read and execute schema
    console.log('📋 Reading schema file...');
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    
    console.log('🔧 Creating tables...');
    // Split by semicolon and execute each statement
    const statements = schema.split(';').filter(s => s.trim().length > 0);
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await postgresDb.query(statement.trim());
        } catch (error) {
          // Ignore "already exists" errors
          if (!error.message.includes('already exists')) {
            console.error('⚠️ Error executing statement:', error.message);
            console.error('Statement:', statement.substring(0, 100));
          }
        }
      }
    }
    console.log('✅ Tables created successfully');
    
    // Seed database if seed file exists
    if (fs.existsSync(SEED_PATH)) {
      console.log('🌱 Seeding database...');
      try {
        const seed = fs.readFileSync(SEED_PATH, 'utf8');
        // Convert SQLite seed to PostgreSQL if needed
        const pgSeed = seed
          .replace(/INSERT OR IGNORE/gi, 'INSERT')
          .replace(/INSERT OR REPLACE/gi, 'INSERT')
          .replace(/ON CONFLICT.*DO NOTHING/gi, 'ON CONFLICT DO NOTHING');
        
        const seedStatements = pgSeed.split(';').filter(s => s.trim().length > 0);
        for (const statement of seedStatements) {
          if (statement.trim()) {
            try {
              await postgresDb.query(statement.trim());
            } catch (error) {
              if (!error.message.includes('duplicate key') && !error.message.includes('already exists')) {
                console.error('⚠️ Error seeding:', error.message);
              }
            }
          }
        }
        console.log('✅ Database seeded successfully');
      } catch (error) {
        console.error('⚠️ Warning: Could not seed database:', error.message);
      }
    }
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await postgresDb.closePool();
  }
}

// Run migration
migrate();

