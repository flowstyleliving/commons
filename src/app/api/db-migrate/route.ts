import { NextResponse } from 'next/server';
import { query } from '@lib/db';

export async function GET() {
  try {
    console.log('Starting database migration...');
    
    // Check if thread_id column exists in room_state table
    let needsThreadIdColumn = false;
    try {
      await query(`SELECT thread_id FROM room_state LIMIT 1`);
      console.log('thread_id column already exists');
    } catch (error: any) {
      if (error.message?.includes('column "thread_id" does not exist')) {
        console.log('thread_id column does not exist, will add it');
        needsThreadIdColumn = true;
      } else {
        console.error('Unexpected error checking for thread_id column:', error);
        throw error; // Re-throw if it's not the expected error
      }
    }
    
    // Check if structured_state column exists in room_state table
    let needsStructuredStateColumn = false;
    try {
      await query(`SELECT structured_state FROM room_state LIMIT 1`);
      console.log('structured_state column already exists');
    } catch (error: any) {
      if (error.message?.includes('column "structured_state" does not exist')) {
        console.log('structured_state column does not exist, will add it');
        needsStructuredStateColumn = true;
      } else {
        console.error('Unexpected error checking for structured_state column:', error);
        throw error; // Re-throw if it's not the expected error
      }
    }
    
    // Add thread_id column if needed
    if (needsThreadIdColumn) {
      console.log('Adding thread_id column to room_state table...');
      await query(`
        ALTER TABLE room_state
        ADD COLUMN thread_id TEXT DEFAULT NULL
      `);
      console.log('Successfully added thread_id column');
    }
    
    // Add structured_state column if needed
    if (needsStructuredStateColumn) {
      console.log('Adding structured_state column to room_state table...');
      await query(`
        ALTER TABLE room_state
        ADD COLUMN structured_state JSONB DEFAULT '{}'::jsonb
      `);
      console.log('Successfully added structured_state column');
    }
    
    // Re-run full init-db to ensure all tables are up to date
    try {
      // Create messages table if it doesn't exist
      await query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          room_id VARCHAR(50) NOT NULL,
          sender VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create room_state table if it doesn't exist (with thread_id and structured_state)
      await query(`
        CREATE TABLE IF NOT EXISTS room_state (
          room_id VARCHAR(50) PRIMARY KEY,
          current_turn VARCHAR(1) NOT NULL,
          assistant_active BOOLEAN DEFAULT FALSE,
          thread_id TEXT DEFAULT NULL, 
          structured_state JSONB DEFAULT '{}'::jsonb, 
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create conversation_setup table if it doesn't exist
      await query(`
        CREATE TABLE IF NOT EXISTS conversation_setup (
          setup_id SERIAL PRIMARY KEY,
          room_id TEXT NOT NULL REFERENCES room_state(room_id) ON DELETE CASCADE,
          questions TEXT[],
          answers JSONB DEFAULT '{}'::jsonb,
          summary TEXT DEFAULT NULL,
          status TEXT NOT NULL DEFAULT 'pending', 
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE (room_id)
        )
      `);
      
      console.log('All tables verified or created');
    } catch (initError) {
      console.error('Error initializing tables:', initError);
      throw initError;
    }
    
    return NextResponse.json({
      status: 'success',
      message: 'Database migration completed successfully',
      changes: [
        ...(needsThreadIdColumn ? ['Added thread_id column to room_state'] : []),
        ...(needsStructuredStateColumn ? ['Added structured_state column to room_state'] : []),
        (!needsThreadIdColumn && !needsStructuredStateColumn) ? 'No changes needed' : null
      ].filter(Boolean)
    });
    
  } catch (error: any) {
    console.error('Error during database migration:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Database migration failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 