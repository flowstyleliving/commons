import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import openai from '../../../../lib/openai';

export async function POST() {
  try {
    // Reset messages
    await query('DELETE FROM messages');
    
    // Reset room state - importantly, set thread_id to NULL to create a fresh thread
    await query(`
      INSERT INTO room_state (current_turn, assistant_active) 
      VALUES ('M', false) 
      ON CONFLICT (id) 
      DO UPDATE SET current_turn = 'M', assistant_active = false, thread_id = NULL
    `);
    
    // Reset active users
    await query('DELETE FROM active_users');
    
    // Add simple welcome message - the assistant will use its configured instructions
    const welcomeMessage = 'Welcome to Komensa Chat!';
    
    await query(`
      INSERT INTO messages (sender, content, room_id) 
      VALUES ('assistant', $1, 'main-room')
    `, [welcomeMessage]);
    
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