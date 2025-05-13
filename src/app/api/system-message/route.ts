import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db';

/**
 * Special endpoint for system-generated welcome messages
 * This bypasses the turn check in the messages endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();
    
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    
    console.log('Creating system welcome message:', content.substring(0, 50) + '...');
    
    // Add the welcome message to the database
    await query(`
      INSERT INTO messages (room_id, sender, content)
      VALUES ('main-room', 'assistant', $1)
    `, [content]);
    
    // Set the turn to M after welcome message is created
    await query(`
      UPDATE room_state 
      SET current_turn = 'M', assistant_active = false, updated_at = CURRENT_TIMESTAMP 
      WHERE room_id = 'main-room'
    `);
    
    // Get all messages for the response
    const allMessages = await query(`
      SELECT * FROM messages 
      WHERE room_id = 'main-room' ORDER BY created_at ASC
    `);
    
    console.log('Welcome message created successfully');
    
    return NextResponse.json({
      success: true,
      messages: allMessages.rows,
      currentTurn: 'M'
    });
  } catch (error) {
    console.error('Error creating system message:', error);
    
    return NextResponse.json({ 
      error: 'Failed to create system message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 