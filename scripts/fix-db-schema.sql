-- Fix for structured_state column issue
ALTER TABLE room_state 
ADD COLUMN IF NOT EXISTS structured_state JSONB DEFAULT '{}'::jsonb;

-- Verify and update other essential columns  
ALTER TABLE room_state 
ADD COLUMN IF NOT EXISTS thread_id TEXT DEFAULT NULL;

-- Verify schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'room_state'; 