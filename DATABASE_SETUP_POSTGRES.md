# PostgreSQL Database Setup Guide

This guide will help you set up a persistent PostgreSQL database for your VidyutAI application on Vercel.

## Quick Start Options

### Option 1: Vercel Postgres (Recommended for Vercel)

1. **Install Vercel Postgres**:
   - Go to your Vercel project dashboard
   - Navigate to Storage → Create Database → Postgres
   - Follow the setup wizard

2. **Get Connection String**:
   - Vercel automatically creates a `POSTGRES_URL` environment variable
   - This is automatically used by the application

3. **Run Migration**:
   ```bash
   # Set the DATABASE_URL environment variable
   export DATABASE_URL=$POSTGRES_URL
   
   # Run migration
   cd backend/database
   node migrate-postgres.js
   ```

### Option 2: Supabase (Free Tier Available)

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for the database to be provisioned

2. **Get Connection String**:
   - Go to Project Settings → Database
   - Copy the "Connection string" (URI format)
   - It looks like: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`

3. **Set Environment Variable**:
   - In Vercel: Project Settings → Environment Variables
   - Add `DATABASE_URL` with your connection string

4. **Run Migration**:
   ```bash
   export DATABASE_URL="your-connection-string"
   cd backend/database
   node migrate-postgres.js
   ```

### Option 3: Other PostgreSQL Providers

You can use any PostgreSQL database:
- **Neon** (neon.tech) - Serverless PostgreSQL
- **Railway** (railway.app) - Easy PostgreSQL hosting
- **AWS RDS** - Enterprise-grade PostgreSQL
- **DigitalOcean** - Managed PostgreSQL
- **Heroku Postgres** - Simple PostgreSQL hosting

For any provider:
1. Create a PostgreSQL database
2. Get the connection string
3. Set `DATABASE_URL` environment variable in Vercel
4. Run the migration script

## Environment Variables

Add these to your Vercel project (Project Settings → Environment Variables):

### Required (choose one):

**Option A: Connection String (Recommended)**
```
DATABASE_URL=postgresql://user:password@host:port/database
```

**Option B: Individual Parameters**
```
POSTGRES_HOST=your-host
POSTGRES_PORT=5432
POSTGRES_USER=your-user
POSTGRES_PASSWORD=your-password
POSTGRES_DB=your-database
```

### Optional:
```
USE_POSTGRES=true  # Force PostgreSQL (auto-detected if DATABASE_URL is set)
```

## Running Migrations

### Local Development

```bash
# Set environment variable
export DATABASE_URL="your-connection-string"

# Run migration
cd backend/database
node migrate-postgres.js
```

### On Vercel

Migrations run automatically when the app starts, but you can also run them manually:

1. Use Vercel CLI:
   ```bash
   vercel env pull .env.local
   export DATABASE_URL=$(grep DATABASE_URL .env.local | cut -d '=' -f2)
   node backend/database/migrate-postgres.js
   ```

2. Or use a one-time Vercel function to run migrations (recommended for production)

## Database Schema

The schema is defined in:
- `backend/database/schema-postgres.sql` - PostgreSQL schema
- `backend/database/schema.sql` - SQLite schema (for local dev)

## How It Works

The application automatically detects which database to use:

1. **If `DATABASE_URL` or `POSTGRES_HOST` is set**: Uses PostgreSQL
2. **Otherwise**: Uses SQLite (for local development)

The database adapter (`backend/database/db-adapter.js`) provides a unified interface that works with both databases.

## Troubleshooting

### Connection Issues

1. **Check connection string format**:
   ```
   postgresql://user:password@host:port/database?sslmode=require
   ```

2. **SSL Requirements**:
   - Most cloud providers require SSL
   - The adapter automatically handles SSL if needed

3. **Connection Pooling**:
   - The adapter uses connection pooling (max 20 connections)
   - This is important for serverless functions

### Migration Errors

1. **"Table already exists"**:
   - This is normal if tables already exist
   - The migration script handles this gracefully

2. **"Permission denied"**:
   - Check that your database user has CREATE TABLE permissions
   - Some providers require superuser privileges for migrations

3. **"Connection timeout"**:
   - Check your firewall settings
   - Ensure your IP is whitelisted (if required)

## Local Development

For local development, you can still use SQLite (no setup required):

```bash
# Just run the app - it will use SQLite automatically
cd backend
npm start
```

To use PostgreSQL locally:

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://localhost:5432/vidyutai"

# Run the app
npm start
```

## Production Checklist

- [ ] PostgreSQL database created
- [ ] `DATABASE_URL` environment variable set in Vercel
- [ ] Migration script run successfully
- [ ] Test user registration/login
- [ ] Verify data persistence across deployments
- [ ] Set up database backups (if not automatic)

## Support

If you encounter issues:
1. Check the application logs in Vercel
2. Verify environment variables are set correctly
3. Test the connection string manually using `psql` or a database client
4. Check the database provider's status page

