-- Migration script to fix primary_goal CHECK constraint issue
-- This removes the CHECK constraint that expects a single value
-- Since we store primary_goal as a JSON array string

-- For PostgreSQL/Neon DB
-- Run this script if you're getting CHECK constraint errors on primary_goal

-- Step 1: Check if constraint exists and drop it
DO $$
BEGIN
    -- Drop the constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'planning_recommendations_primary_goal_check'
        AND table_name = 'planning_recommendations'
    ) THEN
        ALTER TABLE planning_recommendations 
        DROP CONSTRAINT planning_recommendations_primary_goal_check;
        RAISE NOTICE 'Dropped existing primary_goal CHECK constraint';
    ELSE
        RAISE NOTICE 'No primary_goal CHECK constraint found - table is already correct';
    END IF;
END $$;

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'planning_recommendations' 
AND column_name = 'primary_goal';

