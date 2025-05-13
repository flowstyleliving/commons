import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';

export async function GET() {
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
    
    // Create room_state table if it doesn't exist
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
    
    // Check if room_state has the main room
    const roomExists = await query(`
      SELECT COUNT(*) FROM room_state WHERE room_id = 'main-room'
    `);
    
    // Insert main room if it doesn't exist with random first turn (M or E)
    if (parseInt(roomExists.rows[0].count) === 0) {
      // Randomly choose M or E for first turn
      const firstTurn = Math.random() < 0.5 ? 'M' : 'E';
      
      await query(`
        INSERT INTO room_state (room_id, current_turn, assistant_active, structured_state)
        VALUES ('main-room', $1, false, '{}'::jsonb)
      `, [firstTurn]);
      
      // Add welcome message from assistant
      await query(`
        INSERT INTO messages (room_id, sender, content)
        VALUES ('main-room', 'assistant', 'Welcome to Komensa Chat! I\'\'m your AI assistant. M and E can take turns chatting with me. Who would like to start?')
      `);
      // TODO: Create an initial entry in conversation_setup here as well
    }
    
    // Check current state of the database
    const messagesCount = await query(`SELECT COUNT(*) FROM messages`);
    const roomState = await query(`SELECT * FROM room_state WHERE room_id = 'main-room'`);
    
    return NextResponse.json({
      status: 'success',
      message: 'Database initialized successfully',
      messagesCount: parseInt(messagesCount.rows[0].count),
      roomState: roomState.rows[0]
    });
    
  } catch (error: any) {
    console.error('Error initializing database:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Failed to initialize database',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 