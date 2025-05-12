import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';

export async function POST() {
  try {
    // Reset messages
    await query('DELETE FROM messages');
    
    // Reset room state
    await query(`
      INSERT INTO room_state (current_turn, assistant_active) 
      VALUES ('M', false) 
      ON CONFLICT (id) 
      DO UPDATE SET current_turn = 'M', assistant_active = false
    `);
    
    // Reset active users
    await query('DELETE FROM active_users');
    
    // Add initial message from the system
    await query(`
      INSERT INTO messages (sender, content, room_id) 
      VALUES ('assistant', 'Chat has been reset. Welcome to Komensa!', 'main-room')
    `);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Chat reset successfully' 
    });
  } catch (error) {
    console.error('Error resetting chat:', error);
    
    // Return mock success response for development when DB is not available
    if (!process.env.DATABASE_URL || process.env.NODE_ENV === 'development') {
      return NextResponse.json({ 
        success: true, 
        message: 'Chat reset successfully (mock response)' 
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to reset chat' },
      { status: 500 }
    );
  }
} 