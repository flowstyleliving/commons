import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';

// Get current turn
export async function GET() {
  try {
    // Get the current turn and assistant status
    const result = await query(`
      SELECT current_turn, assistant_active FROM room_state 
      WHERE room_id = 'main-room'
    `);
    
    if (result.rows.length === 0) {
      // If no room exists, return default values
      return NextResponse.json({
        current_turn: 'M',
        assistant_active: false
      });
    }
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching turn status:', error);
    
    // Return fallback values if database is not available
    return NextResponse.json({
      current_turn: 'M',
      assistant_active: false
    });
  }
} 